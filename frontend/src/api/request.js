import axios from "axios";
import { ElMessageBox, ElMessage } from "element-plus";

const href = new URL(location.href);
const project_id = href.searchParams.get("project_id") || href.pathname.match(/projects\/(\d+)/)?.[1] || href.hash.match(/projects\/(\d+)/)?.[1] ;
export const baseUrl = 'http://localhost:3021'
// 序列化query，以适应rails
const paramsSerializer = function (obj, prefix) {
    var str = [],
        p;
    if(typeof obj==='object' && obj.length!=null){
        for(let i=0;i<obj.length;i++){
            var k = prefix ? prefix + "[]" : '[]'
            v = obj[i]
            str.push(
                typeof v === "object"
                    ? paramsSerializer(v, k)
                    : encodeURIComponent(k) + "=" + encodeURIComponent(v)
            );
        }
    }else{
        for (p in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (obj.hasOwnProperty(p)) {
                var k = prefix ? prefix + "[" + p + "]" : p,
                    v = obj[p];
                if (v != null) {
                    str.push(
                        typeof v === "object"
                            ? paramsSerializer(v, k)
                            : encodeURIComponent(k) + "=" + encodeURIComponent(v)
                    );
                }
            }
        }
    }

    return str.join("&");
};
// create an axios instance
const service = axios.create({
    baseURL: baseUrl,
    // withCredentials: true, // 跨域请求时发送 cookies
    timeout: 30000, // request timeout
    headers: { Accept: "application/json" },
    paramsSerializer,
});
if (project_id) {
    service.project_id = project_id;
} else {
    // service
    //   .get("/admin/projects/current")
    //   .then((res) => {
    //     console.log("current project", res);
    //   })
    //   .catch((e) => {
    //     let msg = "未指定项目！";
    //     if (e.response.status === 401) msg = "未登录";
    //     ElMessage({
    //       type: "error",
    //       message: msg,
    //       duration: 5000,
    //     });
    //   });
}

//const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
// axios.defaults.headers.common['X-CSRF-Token'] = token;
// axios.defaults.headers.common['Accept'] = 'application/json';
// axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// request interceptor
service.interceptors.request.use(
    (config) => {
        config.url = config.url.replace(":project_id", service.project_id);
        // if (typeof config.params === "object") {
        //   config.params = queryBuilder(config.params);
        // }
        // Do something before request is sent
        // if (store.getters.token) {
        //   // 让每个请求携带token-- ['X-Token']为自定义key 请根据实际情况自行修改
        //   config.headers["X-Token"] = getToken();
        // }
        return config;
    },
    (error) => {
        // Do something with request error
        // console.log(error); // for debug
        Promise.reject(error);
    }
);

// response interceptor
service.interceptors.response.use(
    /**
     * If you want to get information such as headers or status
     * Please return  response => response
     */
    /**
     * 下面的注释为通过在response里，自定义code来标示请求状态
     * 当code返回如下情况则说明权限有问题，登出并返回到登录页
     * 如想通过 XMLHttpRequest 来状态码标识 逻辑可写在下面error中
     * 以下代码均为样例，请结合自生需求加以修改，若不需要，则可删除
     */
    (response) => {
        return response.data;
        // console.log("get response", res);
    },
    (error) => {
        let { response, request } = error;
        if (
            response.status === 401 &&
            !request.responseURL.includes("sign_in") &&
            !location.hash.includes("#/login")
        ) {
            ElMessageBox.confirm(
                "你已被登出，可以取消继续留在该页面，或者重新登录",
                "确定登出",
                {
                    confirmButtonText: "重新登录",
                    cancelButtonText: "取消",
                    type: "warning",
                }
            ).then(() => {
                let u = new URL(location.href);
                u.hash = "#/login";
                location.href = u.href;
                location.reload()
                // const router = useRouter();
                // console.log("router", router);
                // router.push("/login").then(console.log);
                // store.dispatch("user/resetToken").then(() => {
                //   location.reload(); // 为了重新实例化vue-router对象 避免bug
                // });
            });
        } else if (response.status >= 400 && response.status < 500) {
            let msg = "请求内容无效";
            if (
                typeof response.data === "object" &&
                Object.keys(response.data).length > 0
            ) {
                msg =
                    response.data.error ||
                    response.data.message ||
                    JSON.stringify(response.data);
            }
            ElMessage({
                message: msg,
                type: "error",
                duration: 5 * 1000,
            });
        } else {
            ElMessage({
                message: error.toString(),
                type: "error",
                duration: 5 * 1000,
            });
        }
        return Promise.reject(error);
    }
);

export default service;
