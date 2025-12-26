<!--部署模型界面-->
<template>
  <el-row :gutter="20">
    <el-col span="24">
      <el-card shadow="always">
        <div slot="header" class="clearfix">
          <span>部署模型</span>
        </div>
        <el-row>
          <el-col span="16">
            <div class="content">
              <p>部署模型是一个模型专门处理任务部署时……</p>
            </div>
            <div class="upbuttons">
              <el-button type="primary" size="small"><i class="el-icon-s-promotion" />快速开始</el-button>
              <el-button type="primary" size="small"><i class="el-icon-thumb" />产品简介</el-button>
              <el-button type="primary" size="small"><i class="el-icon-document" />产品文档</el-button>
              <el-button type="primary" size="small"><i class="el-icon-edit" />新建模型</el-button>
            </div>
          </el-col>
          <el-col span="8">
            <el-card>
              <img src="#" alt="暂无图片">
            </el-card>
          </el-col>
        </el-row>
      </el-card>
    </el-col>
    <el-col span="24" style="margin-top: 20px">
      <!-- 新建部署模型
      <el-col :span="8" style="margin-top: 10px">
        <el-card style="text-align: center;height: 100%" class="Parent ColForNew">
          <div class="Children">
            <a href="#">
              <i class="el-icon-plus" />
              <span>新建部署模型</span>
            </a>
          </div>
        </el-card>
      </el-col>
      -->
      <!-- 部署模型列表-->
      <el-col v-for="info in DeployModelInfo" :span="8" style="margin-top: 10px">
        <el-card shadow="always" class="ColForList List">
          <div slot="header" class="clearfix">
            <span>{{ info.deploy_model_name }}</span>
          </div>
          <div class="content" style="display: flex;margin-bottom: 10px;">
            <div class="imgs">
              <img :src="info.deploy_model_pictrue" alt="暂无图片">
            </div>
            <div class="descriptions">
              <p>{{ info.deploy_model_desc }}</p>
            </div>
          </div>
          <div style="height: 20px"></div>
          <div class="buttons">
            <el-button v-for="button in info.buttons" :type="button.type" size="small">
              <i :class="button.icon" />{{ button.text }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-col>
    <el-col span="24">
      <div class="footer">
        <a href="#">帮助</a>
        <a href="#">隐私</a>
        <a href="#">条款</a>
      </div>
      <div class="footer-info">
        <span>© 2019-2020</span>
        <span>京ICP备xxxxxxxx号</span>
      </div>
    </el-col>
  </el-row>
</template>

<script>
import {getDeployModelInfo} from '@/api/DeployModel'
export default {
  data() {
    return {
      DeployModelInfo : []
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    this.SetColSize()
  },
  methods: {
    fetchData() {
      getDeployModelInfo().then(res => {
        console.log(res)
        this.DeployModelInfo = res.result
      })
    },
    // 同步各个卡片高度
    SetColSize() {
      const ColForNew = document.querySelector('.ColForNew')
      const ColForList = document.querySelectorAll('.ColForList')
      let MaxColForListHeight = 0
      ColForList.forEach(item => {
        if (item.offsetHeight > MaxColForListHeight) {
          MaxColForListHeight = item.offsetHeight
        }
      })
      ColForNew.style.height = MaxColForListHeight + 'px'
      ColForList.forEach(item => {
        item.style.height = MaxColForListHeight + 'px'
      })
    }
  }

}
</script>

<style scoped>
/*底部区域*/
.footer{
  text-align: center;
  margin-top: 20px;
  color: grey;
}
.footer a{
  margin: 0 10px;
}
.footer-info{
  text-align: center;
  margin-top: 20px;
  color: grey;
}

/*New卡片实现居中*/
.Parent{
  height: 100%;
  position: relative;
}
.Children{
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%,-50%);
}

/*List卡片实现*/
.List{
  position:relative;
}
.buttons{
  position: absolute;
  bottom: 10px;
  right: 10px;
}
/*卡片内容*/
.imgs{
  width: 30%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.descriptions{
  width: 70%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.descriptions p{
  margin: 0;
  font-size: 12px;
}
</style>
