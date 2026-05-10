// Posture Monitor — VL53L5CX 8x8 ToF
// Follows ECE140 convention: ECE140_WIFI + ECE140_MQTT
// Topics published:  TOPIC_PREFIX/data        (live frame, every second)
//                    TOPIC_PREFIX/calibration  (baseline, retained)
//                    TOPIC_PREFIX/status       (calibrating / live)
// Topics subscribed: TOPIC_PREFIX/cmd          (CALIBRATE trigger)

#include <Arduino.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "ECE140_WIFI.h"
#include "ECE140_MQTT.h"

// ── Update these to match your Python server ───────────────
constexpr const char* CLIENT_ID    = "chuach1";
constexpr const char* TOPIC_PREFIX = "chuach1";

// ── Credentials from build_flags / credentials.h ──────────
const char* ucsdUsername              = UCSD_USERNAME;
String      ucsdPassword              = String(UCSD_PASSWORD);
const char* wifiSsid                  = WIFI_SSID;
const char* nonEnterpriseWifiPassword = NON_ENTERPRISE_WIFI_PASSWORD;
bool wpaWifi = true;

// ── Hardware ───────────────────────────────────────────────
#define SDA_PIN      3
#define SCL_PIN      4
#define QWIIC_POWER  7

// ── Sensor ─────────────────────────────────────────────────
SparkFun_VL53L5CX    sensor;
VL53L5CX_ResultsData results;

// ── Constants ──────────────────────────────────────────────
#define ZONES         64
#define MAX_VALID_MM  1200
#define MIN_VALID_MM  20
#define CAL_DURATION  10000
#define SLANT_MILD    25
#define SLANT_SEVERE  60
#define MISSING_MAX   16

// ── State ──────────────────────────────────────────────────
int32_t baseline[ZONES];
int32_t zoneStdDev[ZONES];
bool    zoneValid[ZONES];
bool    calibrated  = false;
bool    doCalibrate = false;

ECE140_MQTT mqtt(CLIENT_ID, TOPIC_PREFIX);
ECE140_WIFI wifi;

// ── Helpers ────────────────────────────────────────────────
bool isValid(int16_t v) {
    return (v >= MIN_VALID_MM && v <= MAX_VALID_MM);
}

void grabFrame() {
    unsigned long t = millis() + 1500;
    while (millis() < t) {
        if (sensor.isDataReady() && sensor.getRangingData(&results)) return;
        delay(10);
    }
}

// NEW — matches ECE140_MQTT.h exactly
void onMqttMessage(char* topic, uint8_t* payload, unsigned int length) {
    char msg[64] = {0};
    memcpy(msg, payload, min(length, (unsigned int)63));
    if (strstr(topic, "/cmd") && strcmp(msg, "CALIBRATE") == 0) {
        doCalibrate = true;
    }
}

// ── Calibration ────────────────────────────────────────────
void runCalibration() {
    calibrated = false;
    mqtt.publishMessage("status", "calibrating");
    Serial.println("[Posture] Calibration started (10s)");

    int32_t accumulator[ZONES] = {0};
    int32_t accumSq[ZONES]     = {0};
    int32_t zoneFrames[ZONES]  = {0};
    int totalFrames = 0;

    unsigned long calStart = millis();
    while (millis() - calStart < CAL_DURATION) {
        mqtt.loop();   // keep MQTT alive during long blocking collect
        if (sensor.isDataReady() && sensor.getRangingData(&results)) {
            for (int i = 0; i < ZONES; i++) {
                int16_t v = results.distance_mm[i];
                if (isValid(v)) {
                    accumulator[i] += v;
                    accumSq[i]     += (int32_t)v * v;
                    zoneFrames[i]++;
                }
            }
            totalFrames++;
        }
        delay(10);
    }

    for (int i = 0; i < ZONES; i++) {
        if (zoneFrames[i] > 5) {
            int32_t mean   = accumulator[i] / zoneFrames[i];
            baseline[i]    = mean;
            int32_t meanSq = accumSq[i] / zoneFrames[i];
            int32_t var    = meanSq - mean * mean;
            zoneStdDev[i]  = (var > 0) ? (int32_t)sqrt((float)var) : 0;
            zoneValid[i]   = (zoneStdDev[i] < 40);
        } else {
            baseline[i]   = 0;
            zoneStdDev[i] = 999;
            zoneValid[i]  = false;
        }
    }

    calibrated = true;

    // Build and publish calibration payload (retained so page always has it)
    String cal = "{\"frames\":" + String(totalFrames);
    cal += ",\"baseline\":[";
    for (int i = 0; i < ZONES; i++) { cal += baseline[i];           if (i < ZONES-1) cal += ","; }
    cal += "],\"valid\":[";
    for (int i = 0; i < ZONES; i++) { cal += (zoneValid[i] ? 1 : 0); if (i < ZONES-1) cal += ","; }
    cal += "],\"stddev\":[";
    for (int i = 0; i < ZONES; i++) { cal += zoneStdDev[i];         if (i < ZONES-1) cal += ","; }
    cal += "]}";

    mqtt.publishMessage("calibration", cal);
    mqtt.publishMessage("status", "live");

    Serial.printf("[Posture] Calibration done. %d frames.\n", totalFrames);
}

// ── Frame assessment + publish ─────────────────────────────
void assessAndPublish() {
    grabFrame();

    int32_t deviation[ZONES];
    int missingCount = 0, offBodyCount = 0;

    for (int i = 0; i < ZONES; i++) {
        int16_t v = results.distance_mm[i];
        if (!zoneValid[i])         { deviation[i] = 0; continue; }
        if (v == 0)                { deviation[i] = 0; missingCount++; }
        else if (v > MAX_VALID_MM) { deviation[i] = 0; offBodyCount++; }
        else                       { deviation[i] = (int32_t)v - baseline[i]; }
    }

    int32_t topWS=0,botWS=0,leftWS=0,rightWS=0;
    int32_t topW=0, botW=0, leftW=0, rightW=0;
    int32_t meanSum=0; int meanCnt=0;

    for (int row = 0; row < 8; row++) {
        for (int col = 0; col < 8; col++) {
            int idx = row*8+col;
            int16_t v = results.distance_mm[idx];
            if (!zoneValid[idx] || v == 0 || v > MAX_VALID_MM) continue;
            int32_t w = max(1, (int32_t)(50 - zoneStdDev[idx]));
            if (row < 4) { topWS  += deviation[idx]*w; topW  += w; }
            else         { botWS  += deviation[idx]*w; botW  += w; }
            if (col < 4) { leftWS += deviation[idx]*w; leftW += w; }
            else         { rightWS+= deviation[idx]*w; rightW+= w; }
            meanSum += deviation[idx]; meanCnt++;
        }
    }

    int32_t vertGrad  = (botW  > 0 ? botWS/botW   : 0) - (topW  > 0 ? topWS/topW   : 0);
    int32_t horizGrad = (rightW> 0 ? rightWS/rightW:0) - (leftW > 0 ? leftWS/leftW  : 0);
    int32_t meanDev   = meanCnt > 0 ? meanSum/meanCnt : 0;

    const char* posture;
    if      (missingCount > MISSING_MAX)    posture = "OVER_SHOULDER";
    else if (offBodyCount > 12)             posture = "SENSOR_MISPLACED";
    else if (vertGrad > SLANT_SEVERE)       posture = "SEVERE_SLOUCH";
    else if (vertGrad > SLANT_MILD)         posture = "MILD_SLOUCH";
    else if (vertGrad < -SLANT_SEVERE)      posture = "SEVERELY_RECLINED";
    else if (vertGrad < -SLANT_MILD)        posture = "LEANING_BACK";
    else if (abs(horizGrad) > SLANT_SEVERE) posture = "SEVERE_LATERAL";
    else if (abs(horizGrad) > SLANT_MILD)   posture = "LATERAL_LEAN";
    else                                    posture = "GOOD";

    // Print to serial like TA5 does
    Serial.print("[Posture] ");
    Serial.print(posture);
    Serial.printf(" | Vert: %+d  Horiz: %+d  Mean: %+d  Missing: %d\n",
        (int)vertGrad, (int)horizGrad, (int)meanDev, missingCount);

    // Build JSON payload — same style as TA5 thermal message
    String message = "{\"posture\":\"" + String(posture) + "\"";
    message += ",\"vert\":"    + String(vertGrad);
    message += ",\"horiz\":"   + String(horizGrad);
    message += ",\"mean\":"    + String(meanDev);
    message += ",\"missing\":" + String(missingCount);
    message += ",\"grid\":[";
    for (int i = 0; i < ZONES; i++) {
        int16_t v = results.distance_mm[i];
        message += (zoneValid[i] && isValid(v)) ? String(v) : "0";
        if (i < ZONES-1) message += ",";
    }
    message += "],\"dev\":[";
    for (int i = 0; i < ZONES; i++) {
        message += deviation[i];
        if (i < ZONES-1) message += ",";
    }
    message += "]}";

    mqtt.publishMessage("data", message);
}

// ── Setup ──────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    // WiFi — same pattern as TA5
    if (wpaWifi == true) {
        wifi.connectToWPAEnterprise("eduroam", "***", "***");
    } else {
        wifi.connectToWiFi("***", "***");
    }

    // MQTT — same pattern as TA5
    mqtt.connectToBroker();
    mqtt.subscribeTopic("cmd");
    mqtt.setCallback(onMqttMessage);

    // Sensor init
    pinMode(QWIIC_POWER, OUTPUT);
    digitalWrite(QWIIC_POWER, HIGH);
    delay(100);

    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(400000);

    if (!sensor.begin()) {
        Serial.println("[ERROR] VL53L5CX not detected!");
        while (1) { delay(1000); }
    }

    sensor.setResolution(8 * 8);
    sensor.setRangingFrequency(10);
    sensor.startRanging();
    Serial.println("[Posture] Sensor OK — starting calibration");

    runCalibration();
}

// ── Loop ───────────────────────────────────────────────────
void loop() {
    mqtt.loop();   // always first, just like TA5

    if (doCalibrate) {
        doCalibrate = false;
        runCalibration();
    }

    if (calibrated) {
        assessAndPublish();
        delay(1000);
    }
}
