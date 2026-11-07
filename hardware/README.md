# Raspberry Pi and Sensors — Forest Monitoring

Demonstration model component that will record detections and send them to the
shared API. See the [main README](../README.md) for the architecture and its
relationship with the mobile app and website.

## Current Status

This folder contains documentation; no sensor-reading or transmission program
has been implemented yet. Installation and execution commands are not available.

## Pending Materials and Configuration

## Planned Behavior

Each valid activation will produce a record with a unique ID, source point,
and original timestamp. A sustained signal must not produce repeated counts.
Transmission must distinguish confirmed receipt, rejection, and communication
failure. An automatic offline queue for the Raspberry Pi is outside the
documented MVP scope.

## Planned Test Procedure

1. Check sensor readings using controlled activations.
2. Keep the sensor activated and verify that it does not count repeatedly.
3. Clear and activate it again to generate another detection.
4. Check the point, ID, and timestamp of the transmitted record.
5. Verify persistence and a count increase only for the corresponding route.
6. Resend the same ID and verify that it is not duplicated.
7. Interrupt communication and verify that successful receipt is not reported.

Once code is available, add the exact installation, configuration, and execution
commands here, along with physical test results.
