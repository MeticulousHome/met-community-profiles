<template>
  <div class="container">
    <input type="file" @change="handleJSONUpload" accept=".json" />
    <div v-if="isProfileLoaded">
      <div>
        <label for="title">Title:</label>
        <input type="text" v-model="title" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="author">Author:</label>
        <input type="text" v-model="author" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="notes">Short Description:</label>
        <input type="text" v-model="short_description" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="notes">Description:</label>
        <input type="text" v-model="notes" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="target_weight">Target Weight:</label>
        <input type="text" v-model="target_weight" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="temperature">Target Temperature:</label>
        <input type="text" v-model="temperature" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="steps">Steps:</label>
        <ul class="stepsList">
          <li v-for="step in steps">
            <ul class="step">
              <li class="stepName"><span >Name: </span>{{ step.name }}</li>
              <li><span>Type: </span>{{ step.pump }}</li>
              <li><span>Transition: </span>{{ step.transition }}</li>
              <li><span>Value: </span>{{ step.pump == "pressure" ? step.pressure +" bars": step.flow + " ml/s" }}</li>
              <li><span>Limit: </span>{{ step.pump == "pressure" ? step.flow != "" ? step.flow + " ml/s"  : "None" : step.pressure != "" ? step.pressure + " bars"  : "None"}}</li>
              <li><span>Exit: </span>{{step.seconds != 127 ? step.seconds + " s" : "No time limit"}} || {{ step.exit? `${step.exit.type} ${step.exit.condition} ${step.exit.value}` : "None"}}</li>
            </ul>
           </li>
        </ul>
      </div>

      <h4>Optional: Select image</h4>
      <input type="file" @change="handleImageUpload" accept="image/*" />
      <img v-if="imagePreview" :src="imagePreview" alt="Image Preview" />

      <h4>Export</h4>
      <button>Download/Send/Whatever the Profile</button>
       <code>
           {{jsonOutput}}
       </code> 
      
      <h2>Non exported Decent specifics:</h2>
      <div>
        <label for="version">Profile Definition Version:</label>
        <span>{{ version }}</span>
      </div>
      <div>
        <label for="hidden">Hidden:</label>
        <span>{{ hidden ? "true" : "false" }}</span>
      </div>

      <div>
        <label for="reference_file">Reference File:</label>
        <span>{{ reference_file }}</span>
      </div>

      <div>
        <label for="changes_since_last_espresso">Changes Since Last Espresso:</label>
        <span>{{ changes_since_last_espresso || "None" }}</span>
      </div>

      <div>
        <label for="legacy_profile_type">Legacy Profile Type:</label>
        <span>{{ legacy_profile_type }}</span>
      </div>

      <div>
        <label for="type">Type:</label>
        <span>{{ type }}</span>
      </div>

      <div>
        <label for="lang">Language:</label>
        <span>{{ lang }}</span>
      </div>

      <div>
        <label for="target_volume">Target Volume:</label>
        <input type="text" v-model="target_volume" @input="updateJsonOutput" />
      </div>

      <div>
        <label for="target_volume_count_start">Target Volume Count Start:</label>
        <span>{{ target_volume_count_start }}</span>
      </div>

      <div>
        <label for="beverage_type">Beverage Type:</label>
        <span>{{ beverage_type }}</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { v4 as uuid_v4 } from 'uuid';
import { comparisonForDecentCondition, STRICT_GREATER_THAN } from './profileComparisons.js';
// TODO there seems to be some kind of fancy export {data: }... logic? How to use that?
const title = ref('');
const author = ref('');
const short_description = ref('Imported from decent');
const notes = ref('');
const beverage_type = ref('');
const tank_temperature = ref('');
const temperature = ref('');
const target_weight = ref('');
const target_volume = ref('');
const target_volume_count_start = ref('');
const legacy_profile_type = ref('');
const steps = ref('');
const type = ref('');
const lang = ref('');
const hidden = ref('');
const reference_file = ref('');
const changes_since_last_espresso = ref('');
const version = ref('');

const jsonOutput = ref('');
const imagePreview = ref(null);
const imageBase64 = ref('');



const isProfileLoaded = ref(false);

watch([title, author, short_description, notes, beverage_type, target_weight, target_volume, target_volume_count_start], updateJsonOutput);


function handleJSONUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/json') {
    const reader = new FileReader();
    reader.onload = () => {
      const jsonData = JSON.parse(reader.result);
      displayJSON(jsonData);
    };
    reader.readAsText(file);
  } else {
    alert('Please upload a valid JSON file');
  }
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      imageBase64.value = reader.result;
      imagePreview.value = reader.result;
    };
    reader.readAsDataURL(file);
  }
}

function convert() {

  const targetJson = {
    name: title,
    id: uuid_v4(),
    author: author,
    author_id: uuid_v4(),
    previous_authors: [],
    display: {
      shortDescription: short_description,
      description: notes,
      image: imageBase64,
    },
    temperature: parseFloat(temperature.value),
    final_weight: target_weight.value != "0" ? parseFloat(target_weight.value) : parseFloat(target_volume.value) - 10,
    variables: [],
    stages: [],
  };

  (steps.value || []).forEach((step, index) => {
    const stageKey = `${step.name.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`;
    const pressureValue = parseFloat(step.pressure);
    const flowValue = parseFloat(step.flow);
    const typeValue = step.pump;
    const limitType = typeValue == "pressure" ? "flow" : "pressure";
    const hasLimit = limitType == "flow" ? flowValue > 0 : pressureValue  > 0;
    const limit = limitType == "pressure" ? pressureValue : flowValue;
    const isInstant =  step.transition == "fast";
    const lastStep = index == 0 ? {pressure: 0, flow: 0} : {pressure: steps.value[index-1].pressure, flow: steps.value[index-1].flow};
    const setPoint = typeValue == "pressure" ? pressureValue : flowValue;
    const lastSetPoint = typeValue == "pressure" ? parseFloat(lastStep.pressure) : parseFloat(lastStep.flow);

    const dynamics = {
      points: [[0, isInstant ? setPoint: lastSetPoint]],
      over: 'time',
      interpolation: "linear",
    };

    if (!isInstant) {
      dynamics.points.push([
        parseFloat(step.seconds), setPoint
      ])
    }

    let exit_triggers = [];
    if (step.seconds != 127) {
      exit_triggers.push(
        {
              type: "time",
              value: parseFloat(step.seconds),
              relative: true,
              comparison: STRICT_GREATER_THAN,
        }
      )
    }
    if (step.exit) {
      exit_triggers.push(
        {
              type: step.exit.type,
              value: parseFloat(step.exit.value),
              relative: false,
              comparison: comparisonForDecentCondition(step.exit.condition),
        }
      )
    }

    targetJson.stages.push({
      name: step.name,
      key: stageKey,
      type: step.pump === 'pressure' ? 'pressure' : 'flow',
      dynamics: dynamics,
      exit_triggers: exit_triggers,
      limits: hasLimit
        ? [
            {
              type: limitType,
              value: limit,
            },
          ]
        : [],
    });
  });

  return targetJson;
}

function updateJsonOutput() {
  jsonOutput.value = convert();
}

function displayJSON(jsonData) {
  title.value = jsonData.title || '';
  author.value = jsonData.author || '';
  notes.value = jsonData.notes || '';
  beverage_type.value = jsonData.beverage_type || '';
  tank_temperature.value = jsonData.tank_temperature || '';
  target_weight.value = jsonData.target_weight || '';
  target_volume.value = jsonData.target_volume || '';
  target_volume_count_start.value = jsonData.target_volume_count_start || '';
  legacy_profile_type.value = jsonData.legacy_profile_type || '';
  type.value = jsonData.type || '';
  lang.value = jsonData.lang || '';
  hidden.value = jsonData.hidden || '';
  reference_file.value = jsonData.reference_file || '';
  changes_since_last_espresso.value = jsonData.changes_since_last_espresso || '';
  version.value = jsonData.version || '';
  steps.value = jsonData.steps || [];
  temperature.value = jsonData.steps[0]?.temperature || "0";

  updateJsonOutput();
  isProfileLoaded.value = true;
}



</script>

<style>
label {
  display: inline-block;
  font-weight: 800;
  padding: 0 .2rem;
  margin-block-start: .8rem;

}
 .stepsList li {
  margin-bottom:3rem;
}

  .step li{
    list-style: none;
    margin:0;
  }
  
  .step li > span {
    font-weight:600;
  } 

  .stepName{
   font-size: 1.2rem;
   font-weight: 800;
  }
  .stepName > span{
    display: none;
  }

  code {
    display: block;
    font-family: 'Courier New', Courier, monospace;
    font-size: .8rem;

  }

 

</style>
