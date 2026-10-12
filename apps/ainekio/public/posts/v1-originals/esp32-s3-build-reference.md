Ainekio ESP32-S3 Build & Firmware Reference

Quick reference for the current Generation 1 Ainekio hardware and ESP32-S3 firmware. The live repository pin map is authoritative if an older design document disagrees with it.

1\. Repositories\
Ainekio repository:\
https\://github.com/Greg-Aster/Ainekio-bot

Sesame Robot reference repository:\
https\://github.com/dorianborian/sesame-robot

Ainekio body gateway:\
The start-physical-gateway.sh file is the gateway launcher. Run it from a terminal; Node.js is re[quired.](https://github.com/Greg-Aster/Ainekio-bot/blob/main/Master/start-physical-gateway.sh)\
[https\://github.com/Greg-Aster/Ainekio-bot/blob/main/Master/start-physical](https://github.com/Greg-Aster/Ainekio-bot/blob/main/Master/start-physical-gateway.sh)\-gateway.sh

2\. ESP32-S3 Controller & Pinout\
Controller: Freenove ESP32-S3-WROOM CAM / FNK0085, N16R8 (16 MB flash, 8 MB octal PSRAM).

Official Freenove FNK0085 documentation:\
https\://docs.freenove.com/projects/fnk0085/en/latest/fnk0085/codes/C/Preface.html

Official Freenove board page:\
https\://store.freenove.com/products/fnk0085

Freenove FNK0085 pinout image source:\
https\://docs.freenove.com/projects/fnk0085/en/latest/\_images/Preface09.png

Ainekio live GPIO map:\
https\://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/components/ainekio\_platform/include/ainekio/platform/pin\_map.h

Important: older Ainekio documents contain a provisional GPIO33/34 map. The current main-branch firmware rejects GPIO33-37 for general use on the delivered N16R8 because octal PSRAM owns them. Use pin\_map.h above as the wiring authority.

Current live assignments:\
• Servos: GPIO 1, 2, 14, 21, 47, 48, 45, 46\
• OLED I2C: SDA GPIO0, SCL GPIO43\
• Battery ADC: GPIO3\
• SD\_MMC: GPIO38 CMD, GPIO39 CLK, GPIO40 DAT0\
• I2S: mic GPIO19, amp GPIO20, BCLK GPIO41, WS GPIO42

3\. OLED Display\
Part: ELEGOO 3PCS 0.96 Inch OLED Display Screen Module, Self-Luminous, SSD1306, I2C, 128×64.\
Product link:\
https\://www\.amazon.com/dp/B0FSRQG23K

Useful details: SSD1306, I2C, 3.3–5 V, default 7-bit address 0x3C.\
Ainekio live wiring: SDA → GPIO0; SCL → GPIO43.

4\. Battery Pack\
Part: sea jump 2PCS 7.4V 1000mAh 2S 10C Li-ion Battery with SM-3P Plug and USB Charging Cable.\
Verified product listing:\
https\://www\.ubuy.co.in/product/Q7WZYTQH4-sea-jump-2pcs-7-4v-1000mah-2s-10c-li-ion-battery-with-sm-3p-plug-and-usb-charging-cable-for-de82-tk3086b-g20601-rc-car-tk-3082b-stunt-flipping-car-c60

Build specification: 2S, 7.4 V nominal, 1000 mAh, 10C, SM-3P connector.\
Note: older Ainekio Parts Overview text lists a 2600 mAh pack. For this reference, the 1000 mAh Sea Jump pack above is the current build battery.

5\. Firmware to Flash\
ESP-IDF firmware project:\
https\://github.com/Greg-Aster/Ainekio-bot/tree/main/Slave/firmware/esp32s3

Repository path:\
Slave/firmware/esp32s3/

Firmware README:\
https\://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/README.md

Physical robot entry point:\
https\://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/main/app\_main.c

Authoritative pin map:\
https\://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/components/ainekio\_platform/include/ainekio/platform/pin\_map.h

Build and flash from Slave/firmware/esp32s3:\
source /home/greggles/esp/esp-idf-v5.5.4/export.sh\
idf.py set-target esp32s3\
idf.py build\
idf.py flash\
idf.py monitor

6\. Existing Ainekio Build Documentation\
Robot Familiar \- Parts Overview:\
https\://docs.google.com/document/d/1wz0kyqttPK3HHL0P0\_9lLtRW\_B87U5u4kEt-UhttHFA/edit

Firmware-Ainekio:\
https\://docs.google.com/document/d/1lc4L2lCaWBcMhWY4lfOYCHUTjKad6MjmrFsp2GbDA4Y/edit

Discussion \- Ainekio:\
https\://docs.google.com/document/d/1W6tBv69McloKX-0O9Lbr3ebVgXQyvL2sXHQsEvOILTo/edit
