<template>
<h2>home.vue</h2>
  <router-link to="/modbus/index">modbus</router-link>
  <img id="logo" alt="Wails logo" src="../assets/images/logo-universal.png"/>
  <HelloWorld/>

</template>
<script setup >
import HelloWorld from "../components/HelloWorld.vue";

import { getCurrentInstance } from 'vue';
const { proxy } = getCurrentInstance();
const ws = proxy.$websocket
setTimeout(() => {
  ws.send("ping")
}, 1000)

</script>