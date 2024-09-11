
<template>
  <div>
    <div style="display: flex; flex-direction: column; align-items: center">
      <div>You</div>
      <video style="max-width: 300px " ref="localUser" playsinline autoplay muted></video>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center">
      <div>Remote</div>
      <video style="max-width: 300px" ref="remoteUser" playsinline autoplay muted></video>
    </div>
  </div>
  <div>
    <button @click="onStartEnd">{{ isInitiated ? 'End': 'Start' }} call</button>
  </div>
  <div v-if="localOffer">
    <div>Your SDP config:</div>
    <div style="font-size: 4px; padding: 16px;">{{localOffer}}</div>
  </div>
  <div style="display: flex; flex-direction: column">
    <textarea placeholder="SDP config from other user" rows="4" v-model="remoteOffer"></textarea>
    <button @click="onJoinAccept" :disabled="!remoteOffer">{{ isInitiated ? 'Accept': 'Join'}}</button>
  </div>

</template>

<script setup>
import {useRTCPeer} from "./composables/UseRTCPeer.js";
import {ref} from "vue";

const remoteOffer = ref('');

const localUser = ref(null);
const remoteUser = ref(null);

const {isInitiated, start, end, accept, join, localOffer} = useRTCPeer();

const onStartEnd = () => {
  if (isInitiated.value) {
    end(localUser, remoteUser)
  }
  else {
    start(localUser, remoteUser)
  }
}

const onJoinAccept = async () => {
  try {
    const parsed = JSON.parse(remoteOffer.value);
    const offer = new RTCSessionDescription(parsed);
    if (isInitiated.value) {
      await accept(remoteUser, offer)
    }
    else {
      await join(localUser, remoteUser, offer)
    }
  } catch (e) {
    console.error('Invalid SDP config', e)
    return
  }
}


</script>
