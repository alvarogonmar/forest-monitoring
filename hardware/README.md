# Raspberry Pi and Sensors

Code and setup documentation for the demonstration model using a Raspberry Pi
and infrared sensors.

Each valid activation produces one detection with a unique ID, sensor-point ID,
and original timestamp. A sustained signal must not generate repeated counts.
Detections are sent to the shared backend using device authorization.

Transmission results must distinguish confirmed receipt, rejection, and
communication failure. Automatic offline buffering is outside the current MVP.

Sensor models, wiring, and setup instructions will be documented as the
hardware is selected and implemented.
