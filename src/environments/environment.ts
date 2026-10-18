export const environment = {
  firebase: {
    apiKey: 'AIzaSyB9iTH27As_KESXKByYUohnF3Cj96cxCLE',
    authDomain: 'fernando-jover-beats.firebaseapp.com',
    projectId: 'fernando-jover-beats',
    appId: '1:25926660103:web:547724af4da1c696aabaa2',
    messagingSenderId: '25926660103',
    storageBucket: 'fernando-jover-beats.firebasestorage.app',
    measurementId: 'G-LM8N19V6KJ'
  },
  adminUid: 'u93cWBnpitPQgUcgjUrfQEhH6Yq2', // UID de Authentication > Users; debe coincidir con las reglas Firestore y Netlify
  contactEmail: 'contacto@tudominio.com', // Sustituir antes de publicar
  instagramUrl: 'https://www.instagram.com/fernandojover/',
  whatsappNumber: '',
  cloudinary: {
    cloudName: 'aexezfok',
    uploadPreset: 'fernando_jover_beats',
    functionsBase: '/.netlify/functions'
  },
  legacyMediaBaseUrl: '', // Opcional: origen HTTPS de archivos antiguos, solo covers/previews
};
