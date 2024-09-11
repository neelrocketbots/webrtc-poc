import {ref} from "vue";

export const useRTCPeer = () => {
  const constraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: true,
  };

  const peerConfig = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
      {
        url: 'turn:turn.speed.cloudflare.com:50000',
        "username":"4028772aeac9e5eab43094fe6ade25dc7816e7f73317f1d8e59ff5c567619e76abb0cad8078c5e8cb0515aa9beae222b64ff6ef5c700e1bbada6f8d9f56566f1",
        "credential":"aba9b169546eb6dcc7bfb1cdf34544cf95b5161d602e3b5fa7c8342b2e9802fb"
      }
    ],
  }

  const isInitiated = ref(false);

  const peer = ref(null);
  const activeStream = ref(null);
  const localOffer = ref(null);

  // OPTIONAL: Starting a connection
  const start = async (localVideoRef, remoteVideRef) => {
    isInitiated.value = true;
    activeStream.value = await navigator.mediaDevices.getUserMedia(constraints);
    localVideoRef.value.srcObject = activeStream.value;

    peer.value = new RTCPeerConnection(peerConfig);
    activeStream.value?.getTracks().forEach((track) => {
      peer.value.addTrack(track, activeStream.value);
    });
    localOffer.value = await peer.value.createOffer();
    await peer.value.setLocalDescription(new RTCSessionDescription(localOffer.value));

    setupListeners(remoteVideRef);

  };

  /**
   * Accepting a connection
   * @param {Ref} remoteVideRef
   * @param {RTCSessionDescription} remoteOffer
   * @return {Promise<void>}
   */
  const accept = async (remoteVideoRef, remoteOffer) => {
    peer.value.ontrack = e => {
      maybeSetCodecPreferences(e)
      remoteVideoRef.value.srcObject = e.streams[0];
    }

    return await peer.value.setRemoteDescription(remoteOffer);
  };


  /**
   * Joining a connection
   * @param {Ref} localVideoRef
   * @param {Ref} remoteVideoRef
   * @param {RTCSessionDescription} remoteOffer
   * @return {Promise<void>}
   */
  const join = async (localVideoRef, remoteVideoRef, remoteOffer) => {
    isInitiated.value = true;
    activeStream.value = await navigator.mediaDevices.getUserMedia(constraints);
    localVideoRef.value.srcObject = activeStream.value;

    // Create a new peer connection, add the tracks and generate offer
    peer.value = new RTCPeerConnection(peerConfig);
    activeStream.value?.getTracks().forEach((track) => {
      peer.value.addTrack(track, activeStream.value);
    });

    peer.value.ontrack = e => {
      maybeSetCodecPreferences(e)
      remoteVideoRef.value.srcObject = e.streams[0];
    }

    // Set the remote offer and listen for the ontrack event
    await peer.value.setRemoteDescription(remoteOffer);

    setupListeners();

    localOffer.value = await peer.value.createAnswer();
    return await peer.value.setLocalDescription(localOffer.value);

  }

  const setupListeners = () => {
    peer.value.addEventListener('icecandidate', e => {
      if (e.candidate) {
        console.log('icecandidate:', e.candidate)
        // peer.value.addIceCandidate(new RTCIceCandidate(e.candidate));
      }
    })

    peer.value.addEventListener('connectionstatechange', e => {
      console.log('connectionstatechange:', e)
    })

    peer.value.addEventListener('icegatheringstatechange', e => {
      console.log('icegatheringstatechange:', e)
      localOffer.value = e.target.localDescription.toJSON();
      if (e.target.iceGatheringState === 'complete')
        console.log('ICE gathering complete:', localOffer.value)
    })
  }


  // Ending call
  const end = (videoRef, remoteVideRef) => {
    peer.value.close();
    activeStream.value.getTracks().forEach((track) => {
      track.stop();
    });
    videoRef.value.srcObject = null;
    remoteVideRef.value.srcObject = null;
  };


  return { isInitiated, localOffer, start, end, join, accept };
}


// eslint-disable-next-line prefer-const
let preferredVideoCodecMimeType = 'video/VP8';

// Helper function to set codec preferences
const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
  'setCodecPreferences' in window.RTCRtpTransceiver.prototype;
function maybeSetCodecPreferences(trackEvent) {
  if (!supportsSetCodecPreferences) return;
  if (trackEvent.track.kind === 'video' && preferredVideoCodecMimeType) {
    const {codecs} = RTCRtpReceiver.getCapabilities('video');
    const selectedCodecIndex = codecs.findIndex(c => c.mimeType === preferredVideoCodecMimeType);
    const selectedCodec = codecs[selectedCodecIndex];
    codecs.splice(selectedCodecIndex, 1);
    codecs.unshift(selectedCodec);
    trackEvent.transceiver.setCodecPreferences(codecs);
  }
}
