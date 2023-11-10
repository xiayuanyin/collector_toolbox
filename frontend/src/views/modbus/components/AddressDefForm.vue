<template>
  <el-dialog
      v-model="visible2"
      title="编辑"
      destroy-on-close
      @close="handleClose"
      width="50%"
      append-to-body
      draggable
  >
    <el-form label-width="120px" v-model="form2" @submit="onSubmit">
      <el-form-item label="群组名">
        <el-input v-model="form2.name"></el-input>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible2 = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script>
import { reactive, toRefs } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CloseBold } from "@element-plus/icons-vue";

export default {
  name: "EditGroup",
  components: { CloseBold },
  props: {
    visible: {
      type: Boolean,
      default: () => false,
    },
    form: {
      type: Object,
      default: () => {},
    },
  },
  setup(props, ctx) {
    const state = reactive({
      loading: false,
      visible2: false
    });

    const form2 = reactive({

    })
    const handleClose = () => {
      ctx.emit("update:visible", false);
    };

    const onSubmit = async (e) => {
      e.preventDefault()

      let id = props.form.id;
      let attr = {
        name: props.form.name,
        public_access: props.form.public_access,
        parent_id: props.form.parent_id,
      };
      ElMessage.success("保存成功！");
      ctx.emit("success");
      handleClose();
    };

    return {
      ...toRefs(state),
      ...toRefs(props),
      form2,
      onSubmit,
      handleClose,
    };
  },
};
</script>
