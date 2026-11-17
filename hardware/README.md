# Raspberry Pi and Sensors — Forest Monitoring

Demonstration model component that will record detections and send them to the
shared API. See the [main README](../README.md) for the architecture and its
relationship with the mobile app and website.

## Current Status

This folder contains documentation; no sensor-reading or transmission program
has been implemented yet. Installation and execution commands are not available.

## Pending Materials and Configuration

### Confirmed Hardware Scope

The prototype will use **one Raspberry Pi** connected to:

- Three infrared (IR) sensors for detection/counting.
- One humidity detector; its model, measured medium, output and unit are pending.
- One physical SOS button at a fixed location in the forest.

### Confirmed Counting Intent

IR 1 is assigned the entry role (+1) and IR 2 the exit role (-1). IR 3 has no
assigned role yet and must not change occupancy or trigger overdue alerts. The
actual monitored route/segment and physical point mapping remain to be configured;
do not assign demonstration IDs to real hardware without confirmation.

The target is estimated occupancy and a possible overdue-presence alert, replacing
the initial assumption that the dashboard merely sums detections. Keep entry and
exit events separately so occupancy can be reconstructed. In a controlled test
starting empty, one entry yields 1 and one subsequent exit yields 0. A real
deployment requires a known baseline or explicit reconciliation; do not assume a
Pi restart means the forest is empty.

The desired alert condition is an entry remaining unmatched beyond a configurable
maximum duration for the monitored route/segment. The expected route duration,
additional margin and matching policy still need agreement. A single global timer
on `occupancy > 0` is insufficient when people enter and leave continuously, and
a new entry must not reset older pending deadlines. Simple IR events do not
identify individuals: FIFO matching, if chosen, is only an explicit approximation,
not evidence that a particular person has left or is missing.

An excess exit, duplicate event, delayed/out-of-order event, restart or sensor
failure must not silently produce a negative count or be treated as proof of a
missing person. Keep the event history and signal inconsistent/uncertain state.
The backend alert evaluator must run even when no new sensor message arrives,
persist deadlines/state across restarts, and deduplicate alerts. No such evaluator,
matching policy or alert schema has been implemented yet.

One `devices` row will represent this Pi. Its permitted IR monitoring points will
be associated through `device_sensor_points`. Existing device tables already
support this arrangement; do not rewrite applied migrations or drop these tables
because only one Pi is planned. The database does not enforce a one-device limit.

The six demo monitoring points currently in the web/database are fictional
fixtures, not a claim that six physical IR sensors exist. Actual point IDs,
locations and route assignments must be agreed before replacing fixtures. Do not
assume the three IR sensors are on three different routes or create a real
device credential in a demo seed.

### Integration Decisions Still Needed

Before implementing hardware ingestion, obtain a sample output or program from
the hardware teammate and confirm:

- Whether IR output contains electrical readings, individual filtered detections,
  increments over an interval, or cumulative counters; include reset/reboot behavior.
- Which physical IR sensor maps to each point and route, and how sustained signals
  and bounce are filtered. Entry/exit meaning follows the configured role (IR 1/IR 2),
  not an inferred direction from an arbitrary pulse. Confirm how reverse walking
  will affect that assumption. Leave IR 3 unassigned until its role is decided.
- The expected traversal duration, overdue margin, baseline procedure and policy
  for matching anonymous entries/exits when several people are present.
- Whether humidity refers to air or soil, the detector model, whether its output
  is binary/raw/calibrated, the unit (if any), and the intended sampling frequency.
  A raw value must not be presented as a humidity percentage without calibration.
- SOS button location, desired press/release behavior and debounce. A held button
  must not become many separate requests; retries retain the same event ID.
- Whether the Pi can send HTTPS JSON and produce event IDs and reliable timestamps.

Reading GPIO is a hardware responsibility. An adapter on the Pi can translate
the teammate's internal representation into the agreed API messages. This keeps
pin assignments and reading-library choices out of web/mobile code. Raw readings,
interval increments and cumulative totals have different counting semantics; do
not sum cumulative totals as if they were new detections. If only totals are
available, revise the ingestion contract and schema with reset and deduplication
rules before accepting them.

## Planned Behavior

The initial IR proposal is one record per valid activation with a unique ID,
source point, and original timestamp. This proposal remains provisional until the
teammate's output is confirmed. A sustained signal must not produce repeated counts.
Transmission must distinguish confirmed receipt, rejection, and communication
failure. An automatic offline queue for the Raspberry Pi is outside the
documented MVP scope.

Humidity will be modeled as timestamped measurements separately from IR
detections. Its schema and validation range are pending the confirmed output;
humidity measurements never increase route detection counts.

A physical SOS press will create a help request identified as a hardware-button
source, distinct from a mobile-app request. The backend will authenticate the Pi
and resolve the button's preconfigured location from trusted configuration; the
button does not need phone GPS. Device identity alone is insufficient to identify
an IR point, humidity detector, or SOS location. Configure those sources explicitly.
Persist the source, origin device and location snapshot with the request. This
requires a later migration and an authenticated hardware endpoint; the current
`help_requests` schema and mobile contract do not yet model this source.

## Planned Test Procedure

1. Check sensor readings using controlled activations.
2. Keep the sensor activated and verify that it does not count repeatedly.
3. Clear and activate it again to generate another detection.
4. Check the point, ID, and timestamp of the transmitted record.
5. Verify persistence: IR 1 increases estimated occupancy for its configured
   route/segment and IR 2 decreases it; IR 3 has no effect while unassigned.
6. Resend the same ID and verify that it is not duplicated.
7. Interrupt communication and verify that successful receipt is not reported.
8. Check humidity independently with the documented output format/unit and ensure
   it does not change route counts.
9. Press the SOS button and verify one hardware-origin help request at its configured
   location; holding it or retrying the same event must not create duplicate requests.
10. From a known empty baseline, test entry/exit (1 then 0), overdue unmatched entry,
    concurrent visitors, excess exit, delayed events and process restart. Verify
    that new entries do not postpone older pending deadlines and that a possible
    overdue alert appears without requiring another sensor message.

Once code is available, add the exact installation, configuration, and execution
commands here, along with physical test results.
