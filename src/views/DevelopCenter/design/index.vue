<template>
  <div class="workflow-container">

    <div>
      <vue-bpmn product="activiti"/>
    </div>

    <!-- 分割线 -->
    <div class="separator"></div>
  </div>
</template>

<script>
import VueBpmn from '@/components/bpmn/VueBpmn.vue'
export default {
  data() {
    return {
      workflowData: [
        { name: "工作流1", description: "工作流1描述" },
        { name: "工作流2", description: "工作流2描述" },
        // 添加更多工作流数据
      ]
    };
  },
  components:{
    VueBpmn
  },
  methods: {
    saveWorkflow() {
      // 在这里添加保存工作流的逻辑
      // 例如，可以使用Axios将工作流数据发送到后端进行保存
    }
    // 在这里添加其他按钮的点击事件处理方法
  }
};
</script>

<style>
/* 自定义样式 */
.workflow-container {
  /* 添加容器样式 */
}

.workflow-buttons {
  /* 添加按钮区域的样式，自定义按钮的布局和样式 */
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 自定义表格样式 */
.el-table {
  /* 添加表格样式 */
}

.el-table th {
  /* 添加表头样式 */
}

.el-table td {
  /* 添加表格单元格样式 */
}

/* 分割线样式 */
.separator {
  height: 1px;
  background-color: #ccc;
  margin: 10px 0;
}

/* 底部按钮居中样式 */
.centered {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
