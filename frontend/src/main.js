import {createApp} from 'vue'
import router from "./router";
import store from "./store";
import App from './App.vue'
import ws_plugin from "./ws_plugin.js";
import 'element-plus/dist/index.css'
const app = createApp(App)
app.use(router);
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import './style.css';
app.use(ElementPlus);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.use(store)
app.use(ws_plugin)
import * as echarts from 'echarts'
app.config.globalProperties.$echarts = echarts
app.mount('#app')
