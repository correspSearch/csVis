<template>
  <div class="d-flex justify-content-center align-items-center w-100 h-100">
    <div id="welcomeDiv" class="d-flex justify-content-center align-items-center">
      {{ labels.infoText }}
    </div>
  </div>
</template>

<script>
export default {
  props: ["labels"],

}
</script>

<style>
#welcomeDiv {
  width: 500px;
  height:500px;
}
</style>