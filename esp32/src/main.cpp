// Posture Monitor — VL53L5CX 8x8 ToF
// 4 classifications: GOOD, MILD_SLOUCH, SEVERE_SLOUCH, LEANING_BACK
// Forward posture via gradient delta. Lean-back via meanDev / tooClose.

#include <Arduino.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "ECE140_WIFI.h"
#include "ECE140_MQTT.h"

constexpr const char* CLIENT_ID    = "chuach1234";
constexpr const char* TOPIC_PREFIX = "chuach1234";

const char* ucsdUsername              = UCSD_USERNAME;
String      ucsdPassword              = String(UCSD_PASSWORD);
const char* wifiSsid                  = WIFI_SSID;
const char* nonEnterpriseWifiPassword = NON_ENTERPRISE_WIFI_PASSWORD;
bool wpaWifi = true;

#define SDA_PIN      3
#define SCL_PIN      4
#define QWIIC_POWER  7

SparkFun_VL53L5CX    sensor;
VL53L5CX_ResultsData results;

#define ZONES        64
#define MAX_VALID_MM 1200
#define MIN_VALID_MM 20
#define CAL_DURATION 5000

// Forward slouch thresholds — delta from calibrated natural gradient
#define VERT_MILD   18
#define VERT_SEVERE 36 

// Lean-back: triggered when back is physically ~30mm from sensor floor,
// or when more than 8 valid zones read below MIN_VALID_MM (too close).
// leanBackMeanThresh = -(cal_mean_dist - MIN_VALID_MM - 30)
#define LEANBACK_HEADROOM 30
#define LEANBACK_TOOCLOSE  8

// ── Calibration state ──────────────────────────────────────
int32_t baseline[ZONES];
int32_t zoneStdDev[ZONES];
bool    zoneValid[ZONES];
int32_t cal_vert_grad = 0;
int32_t cal_horiz_grad = 0;
int32_t cal_mean_dist = 0;
bool    calibrated  = false;
bool    doCalibrate = false;

ECE140_MQTT mqtt(CLIENT_ID, TOPIC_PREFIX);
ECE140_WIFI wifi;

bool isValid(int16_t v) { return (v >= MIN_VALID_MM && v <= MAX_VALID_MM); }

void grabFrame() {
    unsigned long t = millis() + 1500;
    while (millis() < t) {
        if (sensor.isDataReady() && sensor.getRangingData(&results)) return;
        delay(10);
    }
}

void onMqttMessage(char* topic, uint8_t* payload, unsigned int length) {
    char msg[64] = {0};
    memcpy(msg, payload, min(length, (unsigned int)63));
    if (strstr(topic, "/cmd") && strcmp(msg, "CALIBRATE") == 0)
        doCalibrate = true;
}

// ── Gradient computation ───────────────────────────────────
// Weighted by zone reliability (lower stddev = higher weight).
// Only uses zones marked valid during calibration.
void computeVertGradient(int32_t* out_vert) {
    int32_t topWS = 0, botWS = 0;
    int32_t topW  = 0, botW  = 0;

    for (int row = 0; row < 8; row++) {
        for (int col = 0; col < 8; col++) {
            int idx = row * 8 + col;
            int16_t v = results.distance_mm[idx];
            if (!zoneValid[idx] || !isValid(v)) continue;
            int32_t w = max(1, (int32_t)(50 - zoneStdDev[idx]));
            int32_t d = (int32_t)v;
            if (row < 4) { topWS += d*w; topW += w; }
            else         { botWS += d*w; botW += w; }
        }
    }
    *out_vert = (topW > 0 && botW > 0) ? (botWS/botW) - (topWS/topW) : 0;
}

// ── Calibration ────────────────────────────────────────────
void runCalibration() {
    calibrated = false;
    mqtt.publishMessage("status", "calibrating");
    Serial.println("[Posture] Calibration started (5s) — sit straight");

    int32_t accumulator[ZONES] = {0};
    int32_t accumSq[ZONES]     = {0};
    int32_t zoneFrames[ZONES]  = {0};
    int     totalFrames        = 0;

    int32_t vertSum = 0, horizSum = 0, gradFrames = 0;
    int32_t distSum = 0, distCnt  = 0;

    unsigned long calStart = millis();
    while (millis() - calStart < CAL_DURATION) {
        mqtt.loop();
        if (sensor.isDataReady() && sensor.getRangingData(&results)) {
            for (int i = 0; i < ZONES; i++) {
                int16_t v = results.distance_mm[i];
                if (isValid(v)) {
                    accumulator[i] += v;
                    accumSq[i]     += (int32_t)v * v;
                    zoneFrames[i]++;
                    distSum += v;
                    distCnt++;
                }
            }

            int32_t topWS=0, botWS=0, leftWS=0, rightWS=0;
            int32_t topW=0,  botW=0,  leftW=0,  rightW=0;
            for (int row = 0; row < 8; row++) {
                for (int col = 0; col < 8; col++) {
                    int16_t v = results.distance_mm[row*8+col];
                    if (!isValid(v)) continue;
                    if (row < 4) { topWS += v; topW++; }
                    else         { botWS += v; botW++; }
                    if (col < 4) { leftWS += v; leftW++; }
                    else         { rightWS += v; rightW++; }
                }
            }
            if (topW > 0 && botW > 0) {
                vertSum  += (botWS/botW) - (topWS/topW);
                horizSum += (leftW > 0 && rightW > 0) ?
                            (rightWS/rightW) - (leftWS/leftW) : 0;
                gradFrames++;
            }
            totalFrames++;
        }
        delay(10);
    }

    int validCount = 0;
    for (int i = 0; i < ZONES; i++) {
        if (zoneFrames[i] > 5) {
            int32_t mean   = accumulator[i] / zoneFrames[i];
            baseline[i]    = mean;
            int32_t meanSq = accumSq[i] / zoneFrames[i];
            int32_t var    = meanSq - mean * mean;
            zoneStdDev[i]  = (var > 0) ? (int32_t)sqrtf((float)var) : 0;
            zoneValid[i]   = (zoneStdDev[i] < 40);
            if (zoneValid[i]) validCount++;
        } else {
            baseline[i]   = 0;
            zoneStdDev[i] = 999;
            zoneValid[i]  = false;
        }
    }

    cal_vert_grad  = gradFrames > 0 ? vertSum  / gradFrames : 0;
    cal_horiz_grad = gradFrames > 0 ? horizSum / gradFrames : 0;
    cal_mean_dist  = distCnt   > 0  ? distSum  / distCnt    : 0;
    calibrated     = true;

    int32_t lbThresh = -(cal_mean_dist - MIN_VALID_MM - LEANBACK_HEADROOM);
    Serial.printf("[Posture] Cal done. %d frames | NatVert=%+d | "
                  "MeanDist=%d mm | LeanBackThresh=%+d mm | %d/64 valid\n",
                  totalFrames, (int)cal_vert_grad,
                  (int)cal_mean_dist, (int)lbThresh, validCount);

    String cal = "{\"frames\":"    + String(totalFrames);
    cal += ",\"cal_vert\":"        + String(cal_vert_grad);
    cal += ",\"cal_horiz\":"       + String(cal_horiz_grad);
    cal += ",\"cal_mean_dist\":"   + String(cal_mean_dist);
    cal += ",\"leanback_thresh\":" + String(lbThresh);
    cal += ",\"baseline\":[";
    for (int i = 0; i < ZONES; i++) { cal += baseline[i];            if (i < ZONES-1) cal += ","; }
    cal += "],\"valid\":[";
    for (int i = 0; i < ZONES; i++) { cal += (zoneValid[i] ? 1 : 0); if (i < ZONES-1) cal += ","; }
    cal += "],\"stddev\":[";
    for (int i = 0; i < ZONES; i++) { cal += zoneStdDev[i];          if (i < ZONES-1) cal += ","; }
    cal += "]}";

    mqtt.publishMessage("calibration", cal);
    mqtt.publishMessage("status", "live");
}

void assessAndPublish() {
    grabFrame();

    int32_t deviation[ZONES];
    int     tooCloseCount = 0;
    int32_t meanDevSum    = 0;
    int32_t meanDevCnt    = 0;

    for (int i = 0; i < ZONES; i++) {
        int16_t v = results.distance_mm[i];
        if (!zoneValid[i]) { deviation[i] = 0; continue; }

        if (v == 0 || v > MAX_VALID_MM) {
            // No return or out of range — ignore
            deviation[i] = 0;
        } else if (v < MIN_VALID_MM) {
            // Back pressed physically close to sensor — lean-back indicator
            // Count it AND include its (very negative) deviation in meanDev
            deviation[i] = (int32_t)v - baseline[i];
            tooCloseCount++;
            meanDevSum += deviation[i];
            meanDevCnt++;
        } else {
            // Normal valid reading
            deviation[i] = (int32_t)v - baseline[i];
            meanDevSum  += deviation[i];
            meanDevCnt++;
        }
    }

    int32_t meanDev = meanDevCnt > 0 ? meanDevSum / meanDevCnt : 0;

    int32_t live_vert = 0;
    computeVertGradient(&live_vert);
    int32_t dVert = live_vert - cal_vert_grad;

    // Lean-back trigger A: back physically touching sensor floor
    // (>8 valid calibration zones now reading below MIN_VALID_MM)
    bool tooCloseTrigger = (tooCloseCount > LEANBACK_TOOCLOSE);

    // Lean-back trigger B: mean deviation has dropped to within
    // LEANBACK_HEADROOM mm of the sensor floor
    // At cal_mean_dist=130: thresh = -(130 - 20 - 30) = -80 mm
    int32_t leanBackMeanThresh = -(cal_mean_dist - MIN_VALID_MM - LEANBACK_HEADROOM);
    bool meanDevTrigger = (meanDev <= leanBackMeanThresh);

    // Classification:
    // Forward slouch via dVert runs first and takes priority.
    // tooCloseTrigger fires before everything — if zones are physically
    // at the sensor the gradient is meaningless.
    // meanDevTrigger fires last, after confirming dVert is not positive.
    const char* posture;

    if      (tooCloseTrigger)     posture = "LEANING_BACK";
    else if (dVert > VERT_SEVERE) posture = "SEVERE_SLOUCH";
    else if (dVert > VERT_MILD)   posture = "MILD_SLOUCH";
    else if (meanDevTrigger)      posture = "LEANING_BACK";
    else                          posture = "GOOD";

    Serial.printf("[Posture] %s | dVert:%+d meanDev:%+d lbThresh:%+d tooClose:%d\n",
        posture, (int)dVert, (int)meanDev, (int)leanBackMeanThresh, tooCloseCount);

    String message = "{\"posture\":\"" + String(posture) + "\"";
    message += ",\"vert\":"      + String(live_vert);
    message += ",\"horiz\":"     + String(0);
    message += ",\"d_vert\":"    + String(dVert);
    message += ",\"d_horiz\":"   + String(0);
    message += ",\"cal_vert\":"  + String(cal_vert_grad);
    message += ",\"cal_horiz\":" + String(cal_horiz_grad);
    message += ",\"mean\":"      + String(meanDev);
    message += ",\"missing\":"   + String(0);
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

void setup() {
    Serial.begin(115200);
    delay(2000);

    if (wpaWifi) {
        wifi.connectToWPAEnterprise("eduroam", "***", "***");
    } else {
        wifi.connectToWiFi(WIFI_SSID, NON_ENTERPRISE_WIFI_PASSWORD);
    }

    mqtt.connectToBroker();
    mqtt.subscribeTopic("cmd");
    mqtt.setCallback(onMqttMessage);

    pinMode(QWIIC_POWER, OUTPUT);
    digitalWrite(QWIIC_POWER, HIGH);
    delay(100);

    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(400000);

    if (!sensor.begin()) {
        Serial.println("[ERROR] VL53L5CX not detected!");
        while (1) delay(1000);
    }

    sensor.setResolution(8 * 8);
    sensor.setRangingFrequency(10);
    sensor.startRanging();
    Serial.println("[Posture] Sensor OK — starting calibration");
    runCalibration();
}

void loop() {
    mqtt.loop();
    if (doCalibrate) { doCalibrate = false; runCalibration(); }
    if (calibrated)  { assessAndPublish(); delay(1000); }
}