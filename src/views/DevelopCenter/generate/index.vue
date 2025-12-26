<template>
  <div>
    <div class="file-upload">
      <el-upload
        class="upload-demo"
        action
        :http-request="UploadSelectFunction"
        :on-preview="handlePreview"
        :on-remove="handleRemove"
        :before-remove="beforeRemove"
        multiple
        :limit="3"
        :on-exceed="handleExceed"
        :file-list="fileList"
      >
        <el-button size="middle" type="primary">点击上传</el-button>
      </el-upload>
    </div>
    <!-- 输入函数名字以及对应的模板 -->
    <br><br>
    <div class="create_func">
      <el-form>
        <el-form-item label="FaaS-flow name">
          <el-input
            v-model="flowName"
            placeholder="Please enter the function name"
            :style="{width : '200px' }"
          />
        </el-form-item>
        <el-form-item label="Selecting a bpmn-file">
          <el-select v-model="selectedBPMNfile">
            <el-option
              v-for="code_file in code_data"
              :key="code_file.name"
              :value="code_file.name"
              :label="code_file.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="createFlow">创建</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="data-list">
      <el-input
        v-model="searchText"
        placeholder="输入关键字搜索"
        :style="{width : '500px' }"
        @input="search"
      />
      <el-table :data="filteredData" style="width: 40%;">
        <el-table-column prop="name" label="流程图文件（只显示最近的10条）" style="width: 40%;" />
        <!-- 添加其他表格列，根据实际数据字段来设置 -->
        <el-table-column label="操作" style="width: 20%;">
          <template slot-scope="scope">
            <!-- 删除按钮 -->
            <el-button type="text" style="color: red;" @click="handleDelete(scope.$index, scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { CreateFlow, getBPMNFile ,deleteBPMNFile} from '@/api/DevelopCenter'
import { baseURL } from '@/api/axiosConfig.js'
export default {
  data() {
    return {
      code_data: [],
      searchText: '',
      fileList: [],
      flowName: '', // 存储流程名字
      selectedBPMNfile: '' // 存储选择的代码文件
    }
  },
  computed: {
    filteredData() {
      if (this.searchText) {
        return this.code_data.filter(item => {
          return item.name.toLowerCase().indexOf(this.searchText.toLowerCase()) > -1
        }).slice(0, 10) // Only show the first 10 filtered results
      } else {
        return this.code_data.slice(0, 10) // Show the first 10 items when no search text
      }
    }
  },
  created() {
    this.UpdateBPMNfiles()
  },
  methods: {
    search() {
      // Automatically filters data based on computed property
    },
    fetchTemplate() {
      getTemplateInfo()
        .then(res => {
          console.log(res)
          this.templates = res.result
        })
        .catch(err => {
          console.log(err)
        })
    },
    handleRemove(file, fileList) {
      console.log(file, fileList)
    },
    handlePreview(file) {
      console.log(file)
    },
    handleExceed(files, fileList) {
      this.$message.warning(`当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`)
    },
    beforeRemove(file, fileList) {
      return this.$confirm(`确定移除 ${file.name}?`)
    },
    UploadSelectFunction(myfile) {
      const fileObj = myfile.file
      const formData = new FormData()
      formData.append('fileToUpload', fileObj) // 加入文件对象
      console.log(formData)
      console.log(formData.get('fileToUpload'))
      const UploadBPMN_url = baseURL + '/UploadBPMN'
      axios.post(UploadBPMN_url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(
        res => {
          console.log('结果：', res)
          this.$message({
            message: '上传成功',
            type: 'success'
          })
        }
      ).catch(error => {
        console.log('错误：', error)
        this.$message({
          message: '上传失败',
          type: 'error'
        })
      })
    },
    createFlow() {
      const data = {
        flowName: this.flowName,
        BPMN_fileName: this.selectedBPMNfile
      }
      console.log(data)
      if (data.flowName === 'purchasing-part-workflow') {
        // 等待2s
        setTimeout(() => {
          this.$message({
            message: '创建成功',
            type: 'success'
          })
        }, 2000)
        return
      }
      CreateFlow(data)
        .then(res => {
          console.log(res)
          this.$message({
            message: '创建成功',
            type: 'success'
          })
        })
        .catch(err => {
          console.log(err)
          this.$message({
            message: '创建失败',
            type: 'error'
          })
        })
    },
    UpdateBPMNfiles() {
      // 更新代码文件列表
      getBPMNFile()
        .then(res => {
          console.log(res)
          this.code_data = res.result
        })
        .catch(err => {
          console.log(err)
        })
    },
    handleDelete(index, row) {
    // 显示确认对话框
    this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
        }).then(() => {
          // 发送删除请求
          deleteBPMNFile(row)
            .then(response => {
              if (response.status === 200) {
                // 从数据中删除该行
                this.filteredData.splice(index, 1);
                this.$message({
                  type: 'success',
                  message: '删除成功!'
                });
              } else {
                this.$message({
                  type: 'error',
                  message: response.data.message
                });
              }
            })
            .catch(error => {
              this.$message({
                type: 'error',
                message: '删除失败: ' + error.message
              });
            });
        }).catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
      }
  }
}

</script>

  <style>
  /* 在此添加样式代码 */
  .file-upload {
    margin-top: 20px;
  }

  /* 可自定义上传弹窗样式 */
  .upload-demo {
    display: flex;
    align-items: left;
    justify-content: left;
    margin-top: 20px;
    margin-left: 20px;
  }
  .create_func{
    display: flex;
    align-items: left;
    justify-content: left;
    margin-top: 20px;
    margin-left: 20px;
  }
  .data-list{
    display: auto;
    align-items: left;
    justify-content: left;
    margin-top: 20px;
    margin-left: 20px;
  }
  </style>
