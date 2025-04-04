import { useState, useEffect } from 'react'

//--- Bootstrap imports.
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
// import RangeSlider from 'react-bootstrap-range-slider';
import FormRange from 'react-bootstrap/FormRange'
import * as Tone from "tone";

//--- CSS imports.
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'

function App() {

  //--- Device values.
  const [deviceName, setDeviceName] = useState([]);
  const [deviceManufacturer, setDeviceManufacturer] = useState([]);
  const [midiAccess, setMidiAccess] = useState(null);
  const [displayKeys, setDisplayKeys] = useState(new Set());

  //--- Message values.
  const [message, setMessage] = useState([]);
  const [messageName, setMessageName] = useState([]);
  const [noteNumber, setNoteNumber] = useState([]);
  const [noteName, setNoteName] = useState([]);
  const [velocity, setVelocity] = useState([]);

  //--- Processed values.
  const [octaveName, setOctaveName] = useState([]);
  const [noteNames, setNoteNames] = useState([]);
  const [noteCount, setNoteCount] = useState([]);
  const [chordNotes, setChordNotes] = useState([]);
  const [chordName, setChordName] = useState([]);
  const [chordIntervals, setChordIntervals] = useState([]);

  //--- Synthesis values.
  const [attack, setAttack] = useState(0);
  const [decay, setDecay] = useState(0);
  const [sustain, setSustain] = useState(0);
  const [release, setRelease] = useState(0);

  const [instrumentName, setInstrumentName] = useState("instrumentNameSelector");

  //--- Create a Set to hold the pressed notes.
  let pressedKeys = new Set();

  //--- Define the base chords and their intervals.
  const baseChords = {

    //--- C and its variations.
    'C5': [0, 7],
    'C': [0, 4, 7],
    'Cadd9': [0, 4, 7, 11],
    'Cm': [0, 3, 7],

    //--- D and its variations.
    'D5': [2, 9],
    'D': [2, 6, 9],
    'Dsus2': [2, 4, 9],
    'Dsus4': [2, 7, 9],
    'Dm': [2, 5, 9],
    'Dm7': [2, 5, 9, 0],

    'E': [4, 8, 11],
    'Em': [4, 7, 11],
    'F': [5, 9, 0],
    'Fm': [5, 8, 0],
    'G': [7, 11, 2],
    'Gm': [7, 10, 2],
    'A': [9, 1, 4],
    'Am': [9, 0, 4],
    'B': [11, 3, 6],
    'Bm': [11, 2, 6]
  };

  const NOTES = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
  ];

  const instrumentNames = [
    {label: "Synth", valueOf: "Synth"},
    {label: "Sampler", valueOf: "Sampler"},
    {label: "Noise", valueOf: "Noise"},
    {label: "FMSynth", valueOf: "FMSynth"},
    {label: "AMSynth", valueOf: "AMSynth"},
    {label: "PluckSynth", valueOf: "PluckSynth"},
    {label: "MembraneSynth", valueOf: "MembraneSynth"},
    {label: "MetalSynth", valueOf: "MetalSynth"},
    {label: "MonoSynth", valueOf: "MonoSynth"},
    {label: "PolySynth", valueOf: "PolySynth"},
    {label: "DuoSynth", valueOf: "DuoSynth"},
    {label: "PolySixSynth", valueOf: "PolySixSynth"}
  ];

  //--- Kick start audio in the browser if needed.
  document.querySelector("toneStart")?.addEventListener("click", async () => {
    await Tone.start();
    console.log("audio is ready");
  });

  const handleSwitchChange = (value) => {
    setInstrumentName(value); // only one active at a time
  };

  //--- Request MIDI access on component mount.
  useEffect(() => {
    navigator.requestMIDIAccess()
      .then((access) => {
        setMidiAccess(access);
        for (let input of access.inputs.values()) {
          input.onmidimessage = processMIDIMessage;
          setDeviceName(input.name);
          setDeviceManufacturer(input.manufacturer);
        }
      })
      .catch((err) => console.error("MIDI Access Error:", err));
  }, []);

  //--- Use this to generate a list of keys.
  const generateKeys = () => {
    let keys = [];
    for (let octave = 0; octave < 3; octave++) {
      for (let note of NOTES) {
        keys.push(`${note}${octave}`);
      }
    }
    return keys;
  };

  function processMIDIMessage(message) {

    //--- Get the MIDI message data.
    const command = message.data[0];
    const note = message.data[1];
    const velocity = (message.data.length > 2) ? message.data[2] : 0;

    //--- Show the MIDI message data.
    //console.log("MIDI Message:", message.data);

    //--- Set these values.
    setNoteNumber(note)
    setOctaveName(getMidiOcatveName(note));
    setVelocity(velocity);
    setMessage(message.data[0]);
    setMessageName(getMidiMessageName(command));

    //--- Handle the note ON and OFF events.
    if (command === 144 && velocity > 0) { // Note on
      noteOn(note);
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note off
      noteOff(note);
    }
  }

  //--- Handle the note ON event. Add the note to the set and detect the chord.
  function noteOn(note) {
    let fullNoteName = getMidiNoteName(note) + getMidiOcatveName(note)
    setDisplayKeys((prev) => new Set(prev).add(note)); // Show the pressed key.
    setNoteName(fullNoteName); // Show the note name.
    pressedKeys.add(note); // Add to the pressedKeys set.
    // synthesizeNote(fullNoteName)
    processChord(); // And finally process the chord built so far.
  }

  //--- Handle the note OFF event. Remove the note to the set and detect the chord.
  function noteOff(note) {

    // Clear the pressed key.
    setDisplayKeys((prev) => {
      const newKeys = new Set(prev);
      newKeys.delete(note);
      return newKeys;
    });

    setNoteName(""); // Clear the note name.
    pressedKeys.delete(note); // Take the key out of the set.
    processChord(); // And finally process the chord built so far.
  }


  function processChord() {

    //--- Show how many keys were pressed.
    setNoteCount(pressedKeys.size);

    //--- If less than 2 keys are pressed, clear the chord data and return.
    if (pressedKeys.size < 2) {
      setChordNotes("");
      setChordIntervals("");
      setChordName("");
      setNoteNames("");
      return;
    }

    //--- Get the notes and intervals from the pressed keys.
    const notes = Array.from(pressedKeys).sort((a, b) => a - b);
    const noteSet = new Set(notes.map(note => note % 12));

    //--- Show the notes that are pressed.
    setChordNotes(notes);

    //---- Show the notes names that are pressed.
    extractChordNotes(notes);

    //--- Check if the pressed notes match any of the base chords.
    //--- This is running against the baseChords object defined above.
    //--- The intervals value will only set if the notes match the chord intervals.
    for (const [chord, intervals] of Object.entries(baseChords)) {
      if (intervals.every(interval => noteSet.has(interval))) {
        setChordIntervals(intervals);
        setChordName(chord);
      }
    }
  }

  //--- This helps us map a known note to a key on the keyboard.
  const midiNoteToKey = (midiNote) => {
    const note = NOTES[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${note}${octave}`;

  };

  //--- Extract the note names from the note set.
  function extractChordNotes(noteSet) {
    //--- Show the note names that are pressed.
    let result = "";
    noteSet.forEach(key => {
      result += getMidiNoteName(key) + " ";
    });
    setNoteNames(result);
  }

  //--- Get the note name from the MIDI note number.
  function getMidiNoteName(note) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const name = noteNames[note % 12];
    return `${name}`;
  }

  //--- Get the octave name from the MIDI note number.
  function getMidiOcatveName(note) {
    const octave = Math.floor(note / 12) - 1;
    return `${octave}`;
  }



  //--- Get the MIDI message name from the command number.
  function getMidiMessageName(message) {
    const messageNames = {
      128: "Note Off",
      137: "Pad Off",
      144: "Note On",
      153: "Pad Hit",
      176: "Control Change",
      192: "Program Change",
      217: "Pad Full",
      224: "Pitch Bend"

    };
    return messageNames[message] || "Unknown Message";

  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Header className='center'>Envelope</Card.Header>
              <Card.Body>

                <InputGroup className="mb-3">
                  <InputGroup.Text className="w-50" id="basic-addon1">Attack: </InputGroup.Text>
                  <Form.Control value={attack} onChange={setAttack} readOnly />
                  <Form.Range
                    value={attack}
                    onChange={e => setAttack(e.target.value)}
                    min={0}
                    max={1}
                    step={.1}
                  />
                </InputGroup>

                <InputGroup className="mb-3">
                  <InputGroup.Text className="w-50" id="basic-addon1">Decay: </InputGroup.Text>
                  <Form.Control value={decay} onChange={setDecay} readOnly />
                  <Form.Range
                    value={decay}
                    onChange={e => setDecay(e.target.value)}
                    min={0}
                    max={1}
                    step={.1}
                  />
                </InputGroup>

                <InputGroup className="mb-3">
                  <InputGroup.Text className="w-50" id="basic-addon1">Sustain: </InputGroup.Text>
                  <Form.Control value={sustain} onChange={setSustain} readOnly />
                  <Form.Range
                    value={sustain}
                    onChange={e => setSustain(e.target.value)}
                    min={0}
                    max={1}
                    step={.1}
                  />
                </InputGroup>

                <InputGroup className="mb-3">
                  <InputGroup.Text className="w-50" id="basic-addon1">Release: </InputGroup.Text>
                  <Form.Control value={release} onChange={setRelease} readOnly />
                  <Form.Range
                    value={release}
                    onChange={e => setRelease(e.target.value)}
                    min={0}
                    max={1}
                    step={.1}
                  />
                </InputGroup>

              </Card.Body>
            </Card>
          </Col>

          <Col>
            <Card>
              <Card.Header className='center'>Instrument</Card.Header>
              <Card.Body>

                {instrumentNames.map((opt, idx) => (
                  <Form.Check
                    key={idx}
                    type="switch"
                    id={`switch-${opt.valueOf}`}
                    label={opt.label}
                    checked={instrumentName === opt.valueOf}
                    onChange={() => handleSwitchChange(opt.valueOf)}
                    className="mb-2"
                  />
                ))}

              </Card.Body>
            </Card>
          </Col>


        </Row>

      </Container>
    </>
  )
}

export default App