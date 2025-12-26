<template>
  <div class="home-container">
<!--    <h1> Sail</h1>-->
<!--    <div class="subtitle">Integrated Lifecycle Management System for Serverless Applications</div>-->
    <div style="display: flex;justify-content: center;margin-top: 100px;">
      <img :src="titleimg" style="height: auto;width: 400px;">
    </div>
    <el-carousel indicator-position="outside" height="300px">
      <el-carousel-item v-for="(item, index) in carouselImages" :key="index" class="carousel-item-wrapper">
        <img :src="item" class="carousel-image">
      </el-carousel-item>
    </el-carousel>
    <div class="chinese-text-wrapper">
      <div class="chinese-text">核心价值</div>
      <div class="chinese-text">按需构建、主动感知、弹性分配、灵活组织、整体管理、服务友好</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return {
      carouselImages: [
        require('@/assets/images/carousel-1.png'),
        require('@/assets/images/4x-2.png')
      ],
      titleimg: require('@/assets/images/title.png')
    }
  }
}
</script>

<style scoped>
h1 {
  font-family: 'Pacifico', cursive;
  text-shadow: 2px 2px #ccc;
  font-size: 48px;
  font-style: italic;
  text-align: center;
  margin-top: 20px;
}
.subtitle {
  font-style: italic;
  font-size: 30px;
  margin-top: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.carousel-item-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.carousel-image {
  width: 70%;
  height: 350px;
}

.chinese-text-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.chinese-text {
  font-size: 20px;
  text-align: center;
  margin-bottom: 5px;
}

</style>
