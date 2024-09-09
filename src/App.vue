<template>
  <main>
    <div class="content_box" ref="content_box">
      <div v-show="!selected_file" class="bg" @click="do_upload_file()">
        <div class="iphone-icon-box">
          <div class="icon-shadow" v-for="c in 4 * 6" :key="c"></div>
        </div>
        <input
          accept=".png, .jpg"
          ref="file_input"
          style="display: none"
          @change="bg_file_change"
          type="file"
        />

        <v-icon class="upload-icon" size="large" icon="nf nf-md-tray_arrow_up"> </v-icon>
      </div>
      <div v-show="selected_file" ref="canvas_wrap" class="canvas-wrap">
        <canvas class="s" ref="bg_source"></canvas>
        <canvas class="clip" ref="bg_source_clip"></canvas>
        <div class="block_images_box" ref="block_images_box"></div>
      </div>
    </div>
    <div ref="control_elem" class="control-box">
      <div class="control">
        <div @click="pop_control()" class="tongue">
          <v-icon
            size="large"
            :icon="control_elem_visible ? 'nf nf-oct-chevron_up' : 'nf nf-oct-chevron_down'"
          ></v-icon>
        </div>

        <v-select
          v-model="phone_model"
          density="comfortable"
          label="机型"
          :items="phone_models_keys"
        >
        </v-select>

        <div class="control-item-box">
          <number-input :min="0" density="compact" v-model="x_offset" type="number">
            <template v-slot:prepend>X偏移</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="y_offset" type="number">
            <template v-slot:prepend>Y偏移</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="box_width" type="number">
            <template v-slot:prepend>图宽</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="box_height" type="number">
            <template v-slot:prepend>图高</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="row_count" type="number">
            <template v-slot:prepend>行数</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="col_count" type="number">
            <template v-slot:prepend>列数</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="row_space" type="number">
            <template v-slot:prepend>行距</template>
          </number-input>
          <number-input :min="0" density="compact" v-model="col_space" type="number">
            <template v-slot:prepend>列距</template>
          </number-input>
        </div>

        <div class="action-box">
          <v-icon
            @click="do_upload_file()"
            class="upload-icon"
            size="large"
            icon="nf nf-md-image_refresh_outline"
          >
          </v-icon>

          <span style="flex-grow: 1"></span>

          <v-btn
            class="inhibition-disabled-bg"
            ref="do_copy_btn"
            :disabled="do_copy_btn_disable"
            :loading="do_copying"
            @click="do_copy()"
            >复制

            <template v-slot:loader>
              <v-icon v-show="copy_state == 1" icon="nf nf-md-checkbox_marked_circle"></v-icon>
              <v-icon v-show="copy_state == 2" icon="nf nf-md-close_circle"></v-icon>
            </template>
          </v-btn>

          <v-btn
            class="inhibition-disabled-bg"
            ref="do_paste_btn"
            :disabled="do_paste_btn_disabled"
            :loading="do_pasteing"
            @click="do_paste()"
            >粘贴

            <template v-slot:loader>
              <v-icon v-show="paste_state == 1" icon="nf nf-md-checkbox_marked_circle"></v-icon>
              <v-icon v-show="paste_state == 2" icon="nf nf-md-close_circle"></v-icon>
            </template>
          </v-btn>
        </div>
      </div>
    </div>

    <v-snackbar v-model="do_has_err">
      {{ do_errmsg }}
      <template v-slot:actions>
        <v-btn color="blue" variant="text" @click="(do_has_err = false), (do_errmsg = '')">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </main>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import Panzoom from '@panzoom/panzoom'
import NumberInput from './components/number-input.vue'

const x_offset = ref(0)
const y_offset = ref(0)
const box_width = ref(0)
const box_height = ref(0)
const row_count = ref(0)
const col_count = ref(0)
const row_space = ref(0)
const col_space = ref(0)

const canvas_wrap = ref()
const content_box = ref()
const block_images_box = ref<HTMLInputElement>()

const phone_model = ref<string>()

const file_input = ref<HTMLInputElement>()

const selected_file = ref(false)

const control_elem_visible = ref(false)
const control_elem = ref<HTMLElement>()

const bg_source = ref<HTMLCanvasElement>()
const bg_source_clip = ref<HTMLCanvasElement>()
let bg_source_ctx: CanvasRenderingContext2D
let bg_source_clip_ctx: CanvasRenderingContext2D

let panzoom: ReturnType<typeof Panzoom>

onMounted(() => {
  bg_source_ctx = bg_source.value!.getContext('2d') as CanvasRenderingContext2D
  bg_source_clip_ctx = bg_source_clip.value!.getContext('2d') as CanvasRenderingContext2D

  control_hide()
})

let old_elem: HTMLElement
function init_panzoom() {
  let elem = canvas_wrap.value

  panzoom = Panzoom(elem, {
    maxScale: 10,
    minScale: 0.1
  })
  elem.parentElement.addEventListener('wheel', panzoom.zoomWithWheel)

  if (old_elem) {
    old_elem.parentElement?.removeEventListener('wheel', panzoom.zoomWithWheel)
  }

  old_elem = elem
}

function reload_panzoom() {
  if (!panzoom) init_panzoom()
  else panzoom.reset()
}

function do_upload_file() {
  file_input.value?.click()
}

function bg_file_change(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    let f = target.files[0]
    let file_url = URL.createObjectURL(f)

    var img = new Image()
    img.onload = function () {
      selected_file.value = true

      canvas_wrap.value.style.width = img.naturalWidth + 'px'
      canvas_wrap.value.style.height = img.naturalHeight + 'px'
      block_images_box.value!.style.width = img.naturalWidth + 'px'
      block_images_box.value!.style.height = img.naturalHeight + 'px'
      bg_source.value!.width = img.naturalWidth
      bg_source.value!.height = img.naturalHeight
      bg_source_clip.value!.width = img.naturalWidth
      bg_source_clip.value!.height = img.naturalHeight

      reload_panzoom()

      bg_source_ctx.drawImage(img, 0, 0)

      draw_clips()
    }
    img.src = file_url
  }
}

let img_canvas = document.createElement('canvas')
let img_canvas_ctx = img_canvas.getContext('2d')

function draw_clips() {
  img_canvas.width = box_width.value
  img_canvas.height = box_height.value

  let x = x_offset.value
  let y = y_offset.value
  bg_source_clip_ctx.clearRect(0, 0, bg_source.value!.width, bg_source.value!.height)

  bg_source_clip_ctx.fillStyle = '#666666c0'
  bg_source_clip_ctx.fillRect(0, 0, bg_source.value!.width, bg_source.value!.height)

  let block_image_nodes = block_images_box.value!.children

  for (let row_index = 0; row_index < row_count.value; row_index++) {
    for (let col_index = 0; col_index < col_count.value; col_index++) {
      bg_source_clip_ctx.clearRect(x, y, box_width.value, box_height.value)

      let img_data = bg_source_ctx.getImageData(x, y, box_width.value, box_height.value)
      img_canvas_ctx!.putImageData(img_data, 0, 0)

      let image_node = block_image_nodes[
        row_index * col_count.value + col_index
      ] as HTMLImageElement
      image_node.style.top = y + 'px'
      image_node.style.left = x + 'px'
      image_node.src = img_canvas.toDataURL()

      x += box_width.value + col_space.value
    }
    x = x_offset.value
    y += box_height.value + row_space.value
  }
}

watch(
  [x_offset, y_offset, box_width, box_height, row_count, col_count, row_space, col_space],
  (
    [_x_offset, _y_offset, _box_width, _box_height, _row_count, _col_count, _row_space, _col_space],
    [
      _x_offset_old,
      _y_offset_old,
      _box_width_old,
      _box_height_old,
      _row_count_old,
      _col_count_old,
      _row_space_old,
      _col_spac_old
    ]
  ) => {
    void _x_offset, _y_offset, _row_space, _col_space
    void _x_offset_old,
      _y_offset_old,
      _box_width_old,
      _box_height_old,
      _row_count_old,
      _col_count_old,
      _row_space_old,
      _col_spac_old

    if (_row_count_old != _row_count || _col_count_old != _col_count) {
      block_images_box.value!.innerHTML = ''
      for (let row_index = 0; row_index < _row_count; row_index++) {
        for (let col_index = 0; col_index < _col_count; col_index++) {
          let img = document.createElement('img')
          img.style.width = _box_width + 'px'
          img.style.height = _box_height + 'px'
          block_images_box.value!.appendChild(img)
        }
      }
    }
    draw_clips()
  }
)

const phone_models = ref<Record<string, () => void>>({
  'iPhone 14 Pro Max': function () {
    x_offset.value = 105
    y_offset.value = 282
    box_width.value = 192
    box_height.value = 192
    row_count.value = 6
    col_count.value = 4
    row_space.value = 126
    col_space.value = 104
  }
})

const phone_models_keys = computed(() => {
  return Object.keys(phone_models.value)
})

watch(phone_model, (phone_model) => {
  if (phone_model) phone_models.value[phone_model]?.()
})

function control_hide() {
  control_elem.value!.style.bottom = 'calc( -' + control_elem.value!.clientHeight + 'px + 3em)'
}

function pop_control() {
  if (!selected_file.value) return

  if (control_elem_visible.value) {
    control_hide()
  } else {
    control_elem.value!.style.bottom = ''
  }

  control_elem_visible.value = !control_elem_visible.value
}

const do_errmsg = ref()
const do_has_err = ref(false)

const do_copy_btn = ref()
const do_copy_btn_disable = ref(false)
const do_copying = ref(false)
const copy_state = ref(0)
function do_copy() {
  do_copy_btn_disable.value = true
  do_copying.value = true

  function _finally() {
    setTimeout(() => {
      do_copy_btn_disable.value = false
      do_copying.value = false
      copy_state.value = 0
    }, 600)
  }

  if (!phone_model.value) {
    copy_state.value = 2
    do_has_err.value = true
    do_errmsg.value = '尚未选择机型'
    _finally()
    return
  }

  let config_str =
    x_offset.value +
    ',' +
    y_offset.value +
    ',' +
    box_width.value +
    ',' +
    box_height.value +
    ',' +
    row_count.value +
    ',' +
    col_count.value +
    ',' +
    row_space.value +
    ',' +
    col_space.value

  navigator.clipboard
    .writeText(config_str)
    .then(() => {
      copy_state.value = 1
      _finally()
    })
    .catch(() => {
      copy_state.value = 2

      do_has_err.value = true
      do_errmsg.value = '没有权限'

      _finally()
    })
}

const do_paste_btn = ref()
const do_paste_btn_disabled = ref(false)
const do_pasteing = ref(false)
const paste_state = ref(0)
function do_paste() {
  do_paste_btn_disabled.value = true
  do_pasteing.value = true

  function _finally() {
    setTimeout(() => {
      do_paste_btn_disabled.value = false
      do_pasteing.value = false
      paste_state.value = 0
    }, 600)
  }

  navigator.clipboard
    .readText()
    .then((config_str) => {
      let vals = config_str.match(/(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/)
      if (!vals || vals.length != 9) throw new TypeError()

      let _x_offset = vals[1]
      let _y_offset = vals[2]
      let _box_width = vals[3]
      let _box_height = vals[4]
      let _row_count = vals[5]
      let _col_count = vals[6]
      let _row_space = vals[7]
      let _col_space = vals[8]

      phone_models.value['Custom'] = function () {
        x_offset.value = parseInt(_x_offset)
        y_offset.value = parseInt(_y_offset)
        box_width.value = parseInt(_box_width)
        box_height.value = parseInt(_box_height)
        row_count.value = parseInt(_row_count)
        col_count.value = parseInt(_col_count)
        row_space.value = parseInt(_row_space)
        col_space.value = parseInt(_col_space)
      }
      if (phone_model.value == 'Custom') {
        phone_models.value['Custom']()
      } else {
        phone_model.value = 'Custom'
      }

      paste_state.value = 1
      _finally()
    })
    .catch((error) => {
      paste_state.value = 2

      do_has_err.value = true
      if (error instanceof TypeError) {
        do_errmsg.value = '粘贴内容格式错误'
      } else {
        do_errmsg.value = '没有权限获取'
      }
      _finally()
    })
}
</script>

<style scoped>
main {
  height: 100%;
}

.content_box {
  --bg: #ccc;
  --shadow: var(--bg);

  display: grid;
  place-items: center;
  padding: 1em;
  height: 100%;
  padding-bottom: calc(3em + 1em);
  width: 100%;

  background-color: var(--bg);

  .bg {
    place-items: center;
    display: grid;
    position: relative;
    font-size: calc(12px * 4); /*all width 84px * 4 */

    .iphone-icon-box {
      --icon-shadow-margin-LR: 0.25em;

      width: calc(1em + 4em + (8 * var(--icon-shadow-margin-LR)));
      background-color: var(--color-background-soft);
      border-radius: 0.3em;
      padding: 1em 0.5em;

      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(6, 1fr);

      .icon-shadow {
        border-radius: 30%;
        width: 1em;
        height: 1em;
        background-color: #66666666;

        margin: 0.3em var(--icon-shadow-margin-LR);
      }
    }

    .nf {
      color: #666666;
    }

    .upload-icon {
      position: absolute;
      bottom: 0;
      width: 100%;
      font-size: 6em;
    }
  }

  .canvas-wrap {
    position: relative;
    box-shadow: var(--shadow) 0px 0px 40px;

    .clip,
    .block_images_box {
      position: absolute;
      left: 0;
      top: 0;
    }

    .block_images_box > :deep(img) {
      position: absolute;
      left: 0;
      top: 0;
    }
  }
}
@media (prefers-color-scheme: dark) {
  .content_box {
    --bg: #444;
  }
}
.control-box {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  text-align: center;
  transition: bottom 0.2s ease-in;
  .control {
    padding: 0.5em 1em 1em 1em;

    box-shadow: 0px 0px 15px var(--color-background-mute);
    background-color: var(--color-background-mute);
    border-top-left-radius: 1em;
    border-top-right-radius: 1em;

    > .tongue {
      text-align: center;
      margin-bottom: 1em;
    }

    > .action-box {
      display: flex;
      column-gap: 1em;
      align-items: center;

      margin-bottom: 1em;

      .inhibition-disabled-bg {
        .nf {
          color: var(--color-text);
          color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
        }
      }
    }
    > .control-item-box {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      column-gap: 1em;
    }
  }
}
@media (min-width: 1024px) {
  .control-box {
    > .control {
      width: 60em;
      margin-left: auto;
      margin-right: auto;
    }
  }
}
</style>
