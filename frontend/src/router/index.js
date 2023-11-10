import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../views/Home.vue";
import modbusRoutes from "./modbus";
export const routes = [
    {
        path: "/",
        hidden: true,
        name: "HOME",
        component: Home,
        meta: { title: "projectAttr", icon: "Grid", keepAlive: true },
    },
    {
        path: "/modbus",
        name: "MODBUS",
        children: modbusRoutes
    }
];
const router = createRouter({
    scrollBehavior: () => ({ y: 0 }),
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes,
});

export default router;
