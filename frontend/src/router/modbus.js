export default [
    {
        path: "index",
        name: "Modbus Index",
        component: () => import("@/views/modbus/index.vue"),
        meta: { title: "Modbus Index", icon: "Grid", keepAlive: true },
    },
]