const PPQ = 480;

function textEncoder(value) {
  return Buffer.from(String(value), "utf8");
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function variableLength(value) {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return Buffer.from(bytes);
}

function metaEvent(tick, type, data) {
  return { tick, order: 0, bytes: Buffer.concat([Buffer.from([0xff, type]), variableLength(data.length), data]) };
}

function trackNameEvent(name) {
  return metaEvent(0, 0x03, textEncoder(name));
}

function markerEvent(tick, name) {
  return metaEvent(tick, 0x06, textEncoder(name));
}

function tempoEvent(bpm) {
  const microsPerQuarter = Math.round(60000000 / bpm);
  const data = Buffer.from([(microsPerQuarter >> 16) & 0xff, (microsPerQuarter >> 8) & 0xff, microsPerQuarter & 0xff]);
  return metaEvent(0, 0x51, data);
}

function timeSignatureEvent() {
  return metaEvent(0, 0x58, Buffer.from([4, 2, 24, 8]));
}

function keySignatureEvent(scaffold) {
  const majorMinor = scaffold.key.scaleName === "major" ? 0 : 1;
  return metaEvent(0, 0x59, Buffer.from([0, majorMinor]));
}

function noteEvents(track, channel) {
  const events = [];
  for (const clip of track.clips) {
    const clipStartTick = clip.startBar * 4 * PPQ;
    for (const note of clip.notes) {
      const startTick = clipStartTick + Math.round(note.start * PPQ);
      const endTick = startTick + Math.round(note.duration * PPQ);
      events.push({
        tick: startTick,
        order: 2,
        bytes: Buffer.from([0x90 + channel, note.pitch, note.velocity])
      });
      events.push({
        tick: endTick,
        order: 1,
        bytes: Buffer.from([0x80 + channel, note.pitch, 0])
      });
    }
  }
  return events;
}

function buildTrackChunk(events) {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const bytes = [];
  let previousTick = 0;

  for (const event of sorted) {
    const delta = Math.max(0, event.tick - previousTick);
    bytes.push(variableLength(delta), event.bytes);
    previousTick = event.tick;
  }

  bytes.push(variableLength(0), Buffer.from([0xff, 0x2f, 0x00]));
  const body = Buffer.concat(bytes);
  return Buffer.concat([Buffer.from("MTrk"), uint32(body.length), body]);
}

export function writeMidiFile(scaffold) {
  const conductorEvents = [
    trackNameEvent(`${scaffold.meta.label} Arrangement`),
    tempoEvent(scaffold.tempo),
    timeSignatureEvent(),
    keySignatureEvent(scaffold),
    ...scaffold.sections.map((section) => markerEvent(section.startBar * 4 * PPQ, section.name))
  ];

  const conductorTrack = buildTrackChunk(conductorEvents);
  const musicTracks = scaffold.tracks.map((track, index) => {
    const channel = track.role === "drums" ? 9 : index % 9;
    return buildTrackChunk([trackNameEvent(track.name), ...noteEvents(track, channel)]);
  });

  const trackChunks = [conductorTrack, ...musicTracks];
  const header = Buffer.concat([Buffer.from("MThd"), uint32(6), uint16(1), uint16(trackChunks.length), uint16(PPQ)]);
  return Buffer.concat([header, ...trackChunks]);
}
