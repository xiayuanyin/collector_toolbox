<script>
import { defineComponent, onMounted, computed } from "vue";
import {useStore} from "vuex";
export default defineComponent({
  name: "App",
  setup() {
    const store = useStore();
    // onMounted
    onMounted(async () => {
      document.title = "hello"

    });
    return {
    };
  },
  mounted() {
    this.$websocket.init("ws://localhost:3021/ws")
  }
});
</script>

<template>
  <router-view/>
</template>

<style>
#logo {
  display: block;
  width: 50%;
  height: 50%;
  margin: auto;
  padding: 10% 0 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  background-origin: content-box;
}
</style>
