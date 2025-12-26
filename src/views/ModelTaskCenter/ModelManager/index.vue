<!--模型管理模块-->
<template>
  <basic-container>
    <el-header style="margin-top:15px;height: 15px">
      模型管理模块
    </el-header>
    <br>
    <el-form :inline="true" :model="formInline" class="demo-form-inline" size="medium">
      <el-form-item label="  模型名称" size="medium">
        <el-input v-model="formInline.model_name" placeholder="请输入" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onCancel">取消</el-button>
      </el-form-item>
    </el-form>
  	<el-row :gutter="15" v-loading="loading" >
  	  <!-- date遍历循环的数据 -->
      <el-col :span="8" v-for="item in currentPageData" :key="item.id">
        <el-card class="card-style" shadow="hover">
        	<!-- 卡片的头部位 -->
          <el-checkbox v-model="checked" :label="item.id">{{name}}</el-checkbox>
          <!-- 卡片显示的内容 -->
          <div class="card-content">
           <el-descriptions
            title="Vertical list without border"
            :column="4"
            :size="size"
            direction="vertical"
            :style="blockMargin"
           >
              <template #title>
                <span><i class="el-icon-star-on" />{{ item.model_id }}</span>
              </template>
              <el-descriptions-item label="模型名字">{{ item.model_name }}</el-descriptions-item>
              <el-descriptions-item label="模型类型" ><el-tag size="small">{{ item.model_type }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="模型作者" :span="2">{{ item.model_author }}</el-descriptions-item>
              <el-descriptions-item label="公开范围">{{ item.model_scope }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="5">{{ item.model_desc }}</el-descriptions-item>
            </el-descriptions>
            <el-button  type="text" size="middle" @click="openModelDialog(item)">详情</el-button>
          </div>
        </el-card>
        <br>
      </el-col>
    </el-row>

    <!-- 分页 -->
    <el-footer>
      <div class="block" style="text-align: right;margin-right: 50px;">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[6,12, 18, 24, 30]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="data.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
    <!-- 对话框 -->
    <el-dialog title="模型详情" :visible="dialogVisible" @close="closeModelDialog">
      <el-form :model="selectedModel" :rules="rules" ref="modelForm">
        <el-form-item label="模型名称" prop="model_name">
          <el-input v-model="selectedModel.model_name"  :disabled="!editing"/>
        </el-form-item>

        <el-form-item label="模型作者" prop="model_author" >
          <el-input :value="selectedModel.model_author"  :disabled="true" />
        </el-form-item>

        <el-form-item label="模型描述" prop="model_desc" >
          <el-input v-model="selectedModel.model_desc"  :disabled="!editing"/>
        </el-form-item>

        <el-form-item label="公开范围" prop="model_scope" >
          <el-radio-group v-model="selectedModel.model_scope"  :disabled="!editing">
            <el-radio label="私有">私有</el-radio>
            <el-radio label="公有">公有</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="模型镜像" prop="model_image" >
          <el-input v-model="selectedModel.model_image" :disabled="!editing"/>
        </el-form-item>
      </el-form>

      <el-button v-if="!editing" @click="editing = true">修改</el-button>
      <el-button v-else @click="saveChanges">提交</el-button>
      <el-button v-if="!editing" type="danger" @click="deleteModel">删除</el-button>
    </el-dialog>
  </basic-container>
</template>

<script>
import { getModelInfo, update_model,delete_model } from '@/api/ModelManager'
	export default {
		data() {
			return {
        currentPage: 1,
        pageSize: 6,
        selectionList: [],
        dialogVisible : false,
        selectedModel: {}, // 存储选中的模型数据
        editing: false,   // 是否处于编辑模式
        formInline: {
          model_name: '', // 初始化为空，以便用户输入模型名称

        },
        data: [
          {
            model_id: 1,
            model_name: 'DesFaaS',
            model_type: '动态迁移',
            model_author: 'admin',
            model_scope: '私有',
            model_desc: '动态迁移模型',
            // 其他模型信息 ...
          },

        // 其他模型数据 ...
        ],
			}
		},
		computed: {
		  filteredData() {
        // 进行模型名称过滤
        return this.data.filter(item => {
          const nameMatch = item.model_name.toLowerCase().includes(this.formInline.model_name.toLowerCase())
          return nameMatch
        })
      },
      currentPageData() {
        const startIndex = (this.currentPage - 1) * this.pageSize
        const endIndex = startIndex + this.pageSize
        return this.filteredData.slice(startIndex, endIndex)
      }
    },
    created() {
      this.fetchData()
    },
		methods: {
      fetchData() {
        getModelInfo()
          .then(res => {
            console.log(res)
            this.data = res.result
          })
          .catch(err => {
            console.log(err)
          })
      },
	    searchReset() {
	      this.query = {};
	      this.onLoad(this.page);
	    },
	    searchChange(params, done) {
	      this.query = params;
	      this.page.currentPage = 1;
	      this.onLoad(this.page, params);
	      done();
	    },
	    selectionClear() {
	      this.$refs.crud.toggleSelection();
     },
	    currentChange(currentPage) {
	      this.page.currentPage = currentPage;
	    },
	    sizeChange(pageSize) {
	      this.page.pageSize = pageSize;
	    },
	    refreshChange() {
	      this.onLoad(this.page, this.query);
	    },

	    openModelDialog(model) {
        this.selectedModel = { ...model }; // 复制任务数据以防止修改时影响原数据
        this.dialogVisible = true;
      },
      closeModelDialog() {
        this.dialogVisible = false;
        this.editing = false; // 退出编辑模式
      },
      saveChanges() {
        this.editing = false; // 退出编辑模式
        console.log(this.selectedModel)
        // 转化为后端需要的数据格式
        this.selectedModel.model_create_time = this.selectedModel.model_create_time.replace('T', ' ')
        // 调用上传数据的方法
        update_model(this.selectedModel)
          .then(res => {
            console.log(res)
            this.$message({
              message: '修改成功',
              type: 'success'
            })
          })
          .catch(err => {
            console.log(err)
            this.$message({
              message: '修改失败',
              type: 'error'
            })
          })
      },
      deleteModel() {
        // 执行删除任务操作
        this.dialogVisible = false;
        delete_model(this.selectedModel)
          .then(res => {
            console.log(res)
            this.$message({
              message: '删除成功',
              type: 'success'
            })
          })
          .catch(err => {
            console.log(err)
            this.$message({
              message: '删除失败',
              type: 'error'
            })
          })
      },
      handleSizeChange(val) {
        this.pageSize = val
        this.currentPage = 1 // 每次改变每页显示条数时，回到第一页
      },
      handleCurrentChange(val) {
        this.currentPage = val
      },
    }
  }

</script>

<style scoped>
.card-style {
  max-width: 500px; /* 设置卡片的最大宽度 */
  border: 1px solid #e1e1e1; /* 设置边框样式 */
  /* 可以继续添加其他样式 */
}
</style>
