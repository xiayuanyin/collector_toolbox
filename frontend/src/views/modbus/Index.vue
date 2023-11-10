<template>
  <div>
    <h1>Modbus Collector</h1>
    <el-form :inline="true">
      <el-form-item label="Host">
        <el-input v-model="connectInfo.host" :disabled="modbusConnectionInfo.status!=='idle'"></el-input>
      </el-form-item>
      <el-form-item label="Port">
        <el-input v-model.number="connectInfo.port" :disabled="modbusConnectionInfo.status!=='idle'"
                  style="width: 60px"></el-input>
      </el-form-item>
      <el-form-item label="SlaveID">
        <el-input v-model.number="connectInfo.slave_id" :disabled="modbusConnectionInfo.status!=='idle'"
                  style="width: 60px"></el-input>
      </el-form-item>
      <el-form-item label="Interval">
        <el-input v-model.number="connectInfo.interval" :disabled="modbusConnectionInfo.status!=='idle'"
                  style="width: 120px">
          <template #append>ms</template>
        </el-input>
      </el-form-item>
      <el-form-item label="UDP">
        <el-checkbox v-model="connectInfo.udp" :disabled="modbusConnectionInfo.status!=='idle'">
        </el-checkbox>
      </el-form-item>
      <el-form-item>
        <el-button v-if="modbusConnectionInfo.status!=='connected'"
                   :disabled="modbusConnectionInfo.status==='connecting'" type="primary" size="small" @click="connect">Connect
        </el-button>
        <el-button v-if="modbusConnectionInfo.status==='connected'" type="danger" size="small" @click="disconnect">Disconnect
        </el-button>
        <el-button :icon="Plus" type="success" size="small" @click="importProfile">导入配置</el-button>
        <el-button :icon="Cloudy" type="warning" size="small" @click="exportProfile">导出配置</el-button>
      </el-form-item>
    </el-form>
    <div style="display: flex; flex-direction: row; padding-left: 50px;">
      <el-tabs
          v-model="currentTab"
          type="card"
          addable
          :class="s.tabs"
          @tab-add="addReader"
      >
        <el-tab-pane
            v-for="(t, i) in Readers"
            :key="i"
            :label="`${t.table.charAt(0).toUpperCase()} ${t.address}`"
            :title="`${t.table} ${t.address}.${t.length}`"
            @close="removeReader(i)"
        >
          <div :class="s.address_info">
            <div :class="s.address_description">
              <el-text v-if="t.error" type="danger">{{t.error}}</el-text>
              <el-text v-else type="success">{{ t.during }}ms</el-text>
            </div>
            <div>
              <el-button :icon="Edit" type="success" size="small" @click="editAddressDef(i)"></el-button>
              <el-button :icon="Minus" type="danger" size="small" @click="removeReader(i)"></el-button>
            </div>
          </div>
          <el-table :data="t.data">
            <el-table-column label="地址" width="120px">
              <template #default="scope">
                {{ scope.$index + t.address }}
              </template>
            </el-table-column>
            <el-table-column label="原始值" width="120px">
              <template #default="scope">
            <span :class="s.casted_value_text" @click="openOriginWriteDialog(t, scope.$index + t.address)">
                  {{ scope.row }}
              </span>
              </template>
            </el-table-column>
            <el-table-column label="转化值" width="180px">
              <template #default="scope">
                <el-button v-if="t.table==='holding_registers'||t.table==='input_registers'" :icon="Edit" size="small"
                           @click="editCaster(t,scope.$index + t.address )"></el-button>
                <span :class="s.casted_value_text" @click="openValueWriteDialog(t, scope.$index + t.address)">
              {{ getCaster(t, scope.$index + t.address)?.value }}
            </span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
      <div id="a1" :class="s.echarts"></div>
    </div>

    <el-dialog v-model="AddressFormDef.visible" title="设定读取地址">
      <el-form label-width="150px">
        <el-form-item label="Slave ID">
          <el-input v-model.number="AddressFormDef.slave_id">
          </el-input>
        </el-form-item>
        <el-form-item label="地址类型">
          <el-select v-model="AddressFormDef.table">
            <el-option label="Coils" value="coils"></el-option>
            <el-option label="Discrete Inputs" value="discrete_inputs"></el-option>
            <el-option label="Holding Registers" value="holding_registers"></el-option>
            <el-option label="Input Registers" value="input_registers"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model.number="AddressFormDef.address">
          </el-input>
        </el-form-item>
        <el-form-item label="长度">
          <el-input v-model.number="AddressFormDef.length">
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
      <span class="dialog-footer">
        <el-button @click="AddressFormDef.visible = false">关闭</el-button>
        <el-button type="primary" @click="saveAddressDef">
          Confirm
        </el-button>
      </span>
      </template>
    </el-dialog>
    <el-dialog v-model="AddressCastFormDef.visible" width="500px"
               :title="`地址：${AddressCastFormDef.address}(SlaveID: ${AddressCastFormDef.slave_id})`">
      <el-form>
        <el-form-item label="转换数据类型">
          <el-select v-model="AddressCastFormDef.type" style="width: 100px">
            <el-option v-for="x in ValueTypes" :label="x" :value="x"></el-option>
          </el-select>
          <el-switch v-model="AddressCastFormDef.LE" active-text="LittleEndian"></el-switch>
          <el-switch v-model="AddressCastFormDef.WordReverse" active-text="WordReverse"></el-switch>
        </el-form-item>
        <el-form-item>
          <el-switch v-if="AddressCastFormDef.type!=='String'" v-model="AddressCastFormDef.addToCharts"
                     active-text="加入趋势图展示"></el-switch>
        </el-form-item>
        <div v-if="AddressCastFormDef.addToCharts">
          <el-form-item label="图表显示名称">
            <el-input v-model="AddressCastFormDef.name"></el-input>
          </el-form-item>
          <!--          <el-form-item label="数据区间">-->
          <!--            <el-input v-model.number="AddressCastFormDef.chartsMin" style="width: 50%"><template #prepend>Min</template></el-input>-->
          <!--            <el-input v-model.number="AddressCastFormDef.chartsMax" style="width: 50%"><template #prepend>Max</template></el-input>-->
          <!--          </el-form-item>-->
        </div>

      </el-form>
      <template #footer>
      <span class="dialog-footer">
        <el-button @click="AddressCastFormDef.visible = false">Cancel</el-button>
        <el-button v-if="AddressCastFormDef.idx>=0" type="danger" @click="removeCaster">移除</el-button>
        <el-button type="primary" @click="saveCaster">保存</el-button>
      </span>
      </template>
    </el-dialog>
  </div>
</template>
<script>
import {reactive} from "vue";
import {connectModbus, disconnectModbus, modbusWrite, sendModbusCollectAddress} from "@/api/modbus.js";
import {ElMessage} from "element-plus";
import {Edit, Minus, Plus, Cloudy} from "@element-plus/icons-vue";
import AddressDefForm from "./components/AddressDefForm.vue";
import {castValueToWord, castWordArrayTo} from "@/utils/binary_cast.js";

const ValueTypes = ["Word", "DWord", "Int16", "Int32", "Int64", "UInt16", "UInt32", "UInt64", "Float", "Double", "String"]
const connectInfo = reactive({
  host: "127.0.0.1",
  port: 502,
  slave_id: 1,
  interval: 1000,
  udp: false
})
const modbusConnectionInfo = reactive({
  status: 'idle',
  id: null
})
const currentTab = reactive('0')
const AddressFormDef = reactive({
  visible: false,
  idx: -1,
  slave_id: 1,
  table: 'holding_registers',
  address: 100,
  length: 20,
})
const AddressCastFormDef = reactive({
  idx: -1,
  visible: false,
  slave_id: 1,
  table: 'holding_registers',
  address: 100,
  type: 'word',
  LE: false,
  WordReverse: false,
  value: 0,
  addToCharts: false,
  // chartsMin: 0,
  // chartsMax: 10000
})

const Readers = reactive([
  {
    slave_id: 1,
    table: 'holding_registers',
    address: 0,
    length: 20,
    during: null,
    data: [],
    base64: null
  },
])
// {
//   name: "demoValue",
//       table: 'holding_registers',
//     address: 100,
//     slave_id: 1,
//     type: 'Word',
//     LE: false,
//     addToCharts: false,
// }
const valueCasters = reactive([])
const echartsOptions = {
  tooltip: {
    trigger: 'axis',
    position: function (pt) {
      return [pt[0], '10%'];
    }
  },
  legend: {
    data: []
  },
  toolbox: {
    feature: {
      myTool1: {
        show: true,
        title: '导出CSV',
        icon: 'path://M1 1.5C1 0.671573 1.67157 0 2.5 0H10.7071L14 3.29289V13.5C14 14.3284 13.3284 15 12.5 15H2.5C1.67157 15 1 14.3284 1 13.5V1.5ZM2 6H5V7H3V10H5V11H2V6ZM9 6H6V9H8V10H6V11H9V8H7V7H9V6ZM11 6H10V9.70711L11.5 11.2071L13 9.70711V6H12V9.29289L11.5 9.79289L11 9.29289V6Z',
        onclick: function (){
          exportCSV(`modbus-export-data`)
        }
      },
      saveAsImage:{
        title: '下载为图片'
      }
    }
  },
  xAxis: {
    type: 'time',
    boundaryGap: false
  },
  yAxis: {
    type: 'value',
  },
  series: []
}
function exportCSV(filename) {
  if (!/\.csv$/.test(filename)) {
    filename = `${filename}.csv`
  }
  // 获取导出的数据
  var data = [echartsOptions.series.map(s=>['time', s.name].join(",")).join(',')]
  let idx=0
  while(true){
    let rowData = []
    echartsOptions.series.forEach((s, i)=>{
      if(s.data[idx]){
        rowData.push([s.data[idx][0].toLocaleString(), s.data[idx][1]])
      }else{
        rowData.push(['', ''])
      }

    })
    if(rowData.map(r=>r.join('')).join('')==='') break
    data.push(rowData.map(x=>x.join(',')).join(','))
    idx++
  }

  // 创建 Blob 对象
  var blob = new Blob([data.join("\n")], {type: 'text/csv;charset=utf-8;'});
  // 创建下载链接
  var downloadLink = document.createElement('a');
  downloadLink.setAttribute('download', filename);
  downloadLink.setAttribute('href', URL.createObjectURL(blob));
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  // 触发下载链接
  downloadLink.click();
  // 移除下载链接
  document.body.removeChild(downloadLink);
}
let e
let setOptionInterval
export default {
  name: "ModbusIndex",
  components: {Plus, AddressDefForm},
  setup() {
    return {
      connectInfo,
      modbusConnectionInfo,
      Readers,
      AddressFormDef,
      AddressCastFormDef,
      ValueTypes,
      valueCasters,
      currentTab,
      Plus, Minus, Edit, Cloudy
    }
  },
  sockets: {
    connect() {
      console.log("<<<<<<in modbus socket connected")
    },
    message(data) {
      if (data.id === modbusConnectionInfo.id) {
        if (data.type === 'modbus_read') {
          let d = Readers.find(r => r.table === data.table && r.address === data.address && r.length === data.length && r.table === data.table && r.slave_id === data.slave_id)
          if (d) {
            d.during = data.during
            if(data.error!==''){
              d.error = data.error
              return
            }else{
              d.error = null
            }
            d.data = data.data
          }
          let addressEnd = data.address + data.length
          valueCasters.forEach(c => {
            if (c.table === data.table && c.address >= data.address && c.address < addressEnd && data.slave_id === c.slave_id) {
              let word_array = data.data.slice(c.address - data.address)
              c.value = castWordArrayTo(c.type, word_array, c.LE, c.WordReverse)
              if (c.addToCharts) {
                let series = echartsOptions.series.find(s => s.name === c.name)
                if (series == null) {
                  series = {
                    name: c.name,
                    type: 'line',
                    symbol: 'none',
                    hoverAnimation: false,
                    data: []
                  }
                  echartsOptions.series.push(series)
                }
                series.data.push([new Date(), c.value])

              }
            }

          })
        } else if (data.type === 'modbus_closed') {
          modbusConnectionInfo.status = 'idle'
          ElMessage.error("连接已关闭")
        }
      }
    },
    disconnect() {
      console.log("<<<<<<in modbus socket disconnected")
    }
  },
  methods: {
    connect() {
      this.modbusConnectionInfo.status = 'connecting'
      connectModbus(this.connectInfo).then(r => {
        if (r.id) {
          modbusConnectionInfo.id = r.id
          modbusConnectionInfo.status = 'connected'
          ElMessage.success("连接成功")
          this.$websocket.send('online', {id: r.id, type: 'modbus'})
          this.changeAddress()
        } else {
          modbusConnectionInfo.status = 'idle'
          ElMessage.error("连接失败")
        }
      }).catch(e => {
        modbusConnectionInfo.status = 'idle'
      })
    },
    disconnect() {
      if (modbusConnectionInfo.status === "connected" && modbusConnectionInfo.id) {
        disconnectModbus(modbusConnectionInfo.id).then(r => {
          modbusConnectionInfo.status = 'idle'
          ElMessage.success("连接已关闭")
        }).catch(e => {
          // modbusConnectionInfo.status = 'connected'
        })
      }

    },
    editAddressDef(idx) {
      let r = Readers[idx]
      if (r == null) {
        r = {
          slave_id: 1,
          table: 'holding_registers',
          address: 0,
          length: 10,
          data: [],
        }
      }
      AddressFormDef.idx = idx
      AddressFormDef.visible = true
      AddressFormDef.slave_id = r.slave_id
      AddressFormDef.address = r.address
      AddressFormDef.length = r.length
      AddressFormDef.table = r.table
    },
    saveAddressDef() {
      let idx = AddressFormDef.idx
      let repeatAddress = Readers.find((r, i) => i!==idx && r.table === AddressFormDef.table && r.address === AddressFormDef.address && r.slave_id === AddressFormDef.slave_id)
      if(repeatAddress){
        ElMessage.error("地址重复")
        return
      }
      AddressFormDef.visible = false
      if (Readers[idx] == null) {
        Readers.push({
          slave_id: 1,
          table: 'holding_registers',
          address: 0,
          length: 10,
          data: [],
        })
        idx = Readers.length - 1
      }
      Readers[idx].slave_id = AddressFormDef.slave_id
      Readers[idx].address = AddressFormDef.address
      Readers[idx].length = AddressFormDef.length
      Readers[idx].table = AddressFormDef.table
      this.changeAddress()
    },
    changeAddress() {
      if (modbusConnectionInfo.id == null) return
      if (modbusConnectionInfo.status !== 'connected') return
      let addresses = []
      this.Readers.forEach(r => {
        addresses.push({
          address: r.address,
          table: r.table,
          length: r.length,
          slave_id: r.slave_id
        })
      })
      sendModbusCollectAddress(modbusConnectionInfo.id, addresses)
      // this.$websocket.send('modbus_read', {id: modbusConnectionInfo.id, type: 'modbus', address: this.Readers[0].address, length: this.Readers[0].length, table: this.Readers[0].table})
    },
    addReader() {
      this.editAddressDef(-1)
    },
    removeReader(i) {
      let reader = Readers[i]
      if (reader == null) return
      if (reader.table === 'holding_registers' || reader.table === 'input_registers') {
        while(true){
          let idx = valueCasters.findIndex(c => c.table === reader.table && c.slave_id === reader.slave_id && c.address >= reader.address && c.address < reader.address + reader.length)
          if (idx < 0) break
          if(valueCasters[idx].addToCharts){
            let seriesIdx = echartsOptions.series.findIndex(s => s.name === valueCasters[idx].name)
            if (seriesIdx>=0)  echartsOptions.series.splice(seriesIdx, 1)
          }
          valueCasters.splice(idx, 1)
        }
      }
      Readers.splice(i, 1)
    },
    getCaster(reader, casterAddress) {
      return valueCasters.find(c => c.table === reader.table && c.address === casterAddress && c.slave_id === reader.slave_id)
    },
    removeCaster() {
      if (AddressCastFormDef.idx < 0 || AddressCastFormDef.idx >= valueCasters.length) return
      if (AddressCastFormDef.addToCharts) {
        let seriesIdx = echartsOptions.series.findIndex(s => s.name === AddressCastFormDef.name)
        if (seriesIdx>=0) {
          echartsOptions.series.splice(seriesIdx, 1)
        }
      }
      valueCasters.splice(AddressCastFormDef.idx, 1)
      AddressCastFormDef.visible = false
    },
    editCaster(reader, casterAddress) {
      let idx = valueCasters.findIndex(c => c.table === reader.table && c.address === casterAddress && c.slave_id === reader.slave_id)
      let c = valueCasters[idx]
      AddressCastFormDef.idx = idx
      if (idx < 0) {
        c = {
          name: `${reader.table}-${casterAddress}`,
          table: reader.table,
          address: casterAddress,
          slave_id: reader.slave_id,
          type: 'Word',
          LE: false,
          WordReverse: false,
          value: 0,
          addToCharts: false,

        }
      }
      AddressCastFormDef.visible = true
      AddressCastFormDef.name = c.name
      AddressCastFormDef.slave_id = reader.slave_id
      AddressCastFormDef.address = casterAddress
      AddressCastFormDef.table = reader.table
      AddressCastFormDef.type = c.type
      AddressCastFormDef.LE = c.LE
      AddressCastFormDef.value = c.value
      AddressCastFormDef.addToCharts = c.addToCharts
      // AddressCastFormDef.chartsMin = c.chartsMin
      // AddressCastFormDef.chartsMax = c.chartsMax
    },
    saveCaster() {
      let idx = AddressCastFormDef.idx
      let c = valueCasters[idx]
      let addNewSeries = false
      if (idx < 0) {
        c = {}
        valueCasters.push(c)
        idx = valueCasters.length - 1
        addNewSeries = true
      }
      let oldName = c.name
      let newName = AddressCastFormDef.name
      let needRemoveSeries = !addNewSeries && c.addToCharts && !AddressCastFormDef.addToCharts
      if (needRemoveSeries) {
        let seriesIdx = echartsOptions.series.findIndex(s => s.name === oldName)
        if (seriesIdx >= 0) {
          echartsOptions.series.splice(seriesIdx, 1)
        }
      }
      if (addNewSeries) {
        let series = {
          name: newName,
          type: 'line',
          symbol: 'none',
          hoverAnimation: false,
          data: []
        }
        echartsOptions.series.push(series)
      } else if (oldName !== newName && AddressCastFormDef.addToCharts) {
        let series = echartsOptions.series.find(s => s.name === oldName)
        if (series) {
          series.name = newName
        }
      }
      AddressCastFormDef.visible = false
      c.slave_id = AddressCastFormDef.slave_id
      c.address = AddressCastFormDef.address
      c.table = AddressCastFormDef.table
      c.type = AddressCastFormDef.type
      c.LE = AddressCastFormDef.LE
      c.WordReverse = AddressCastFormDef.WordReverse
      c.value = AddressCastFormDef.value
      c.addToCharts = AddressCastFormDef.addToCharts
      c.name = AddressCastFormDef.name
      echartsOptions.legend.data = echartsOptions.series.map(s => s.name)
    },
    openOriginWriteDialog(r, address) {
      if (modbusConnectionInfo.status !== 'connected') return
      if (r.table === 'input_registers' || r.table === 'discrete_inputs') return
      let type = r.table === 'holding_registers' ? 'Word' : 'Bool'
      this.$prompt(`请输入需要写入的值, 地址:${address}`, `修改值(${type})`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        // inputPattern: /\d+/,
        // inputErrorMessage: '请输入数字'
      }).then(({value}) => {
        if (value === '') {
          return this.$message({
            type: 'error',
            message: '输入不能为空'
          });
        }
        if (type === 'Word') {
          value = Number(value)
        } else {
          value = (value === 'true' || value === '1' || value === "True" || value === 'TRUE') ? 1 : 0
        }
        let words = [value]
        modbusWrite(modbusConnectionInfo.id, {
          id: modbusConnectionInfo.id,
          slave_id: r.slave_id,
          table: r.table,
          address: address,
          data_array: words
        }).then(r => {
          ElMessage.success("写入成功")
        })
      }).catch((e) => {
        console.log("cancel", e)
      });
    },
    openValueWriteDialog(r, address) {
      let reader = this.getCaster(r, address)
      if (reader == null) return
      if (modbusConnectionInfo.status !== 'connected') return
      if (r.table === 'input_registers' || r.table === 'discrete_inputs') return
      this.$prompt(`请输入需要写入的值, 地址:${reader.address}`, `修改值(${reader.type})`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        // inputPattern: /\d+/,
        // inputErrorMessage: '请输入数字'
      }).then(({value}) => {
        if (value === '') {
          return this.$message({
            type: 'error',
            message: '输入不能为空'
          });
        }
        if (reader.type === 'String') {
          value = value.toString()
        } else {
          value = Number(value)
        }
        let words = castValueToWord(reader.type, value, reader.LE, reader.WordReverse)
        modbusWrite(modbusConnectionInfo.id, {
          id: modbusConnectionInfo.id,
          slave_id: reader.slave_id,
          table: reader.table,
          address: reader.address,
          data_array: words
        }).then(r => {
          ElMessage.success("写入成功")
        })
      }).catch((e) => {
        console.log("cancel", e)
      });
    },
    exportProfile(){
      const json = {
        Readers, connectInfo, valueCasters
      }
      const link = document.createElement("a");
      const file = new Blob([JSON.stringify(json)], { type: 'text/plain' });
      link.href = URL.createObjectURL(file);
      link.download = "modbus-collector-config.json";
      link.click();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
      }, 100);
    },
    importProfile(){
      let f = document.createElement('input')
      f.type = 'file'
      f.accept = '.json'
      f.style.display = 'none'
      document.body.appendChild(f)
      f.onchange = (e)=>{
        let file = e.target.files[0]
        if(file.size>1024*1024*10){
          ElMessage.error("文件过大")
          document.body.removeChild(f)
          return
        }
        console.log(file)
        let reader = new FileReader()
        reader.onload = (e)=>{
          try{
            let json = JSON.parse(e.target.result)
            Object.assign(Readers, json.Readers)
            Object.assign(connectInfo, json.connectInfo)
            Object.assign(valueCasters, json.valueCasters)
            echartsOptions.legend.data = valueCasters.filter(c=>c.addToCharts).map(c=>c.name)
          }catch (e){
            console.log(e)
            ElMessage.error("导入失败")
          }finally {
            document.body.removeChild(f)
          }
        }
        reader.readAsText(file)
      }
      f.oncancel = ()=>{
        document.body.removeChild(f)
      }
      f.click()
    }

  },

  mounted() {
    e = this.$echarts.init(document.getElementById('a1'))
    if(setOptionInterval) clearInterval(setOptionInterval)
    setOptionInterval = setInterval(()=>{
      if(modbusConnectionInfo.status!=='connected') return
      e.setOption(echartsOptions)
    }, 1000)

  },
  beforeDestroy() {
    if(setOptionInterval) clearInterval(setOptionInterval)
    this.disconnect()
  }
}
</script>
<style module="s">
.address_info {
  display: flex;
}

.address_description {
  flex: 1;
  text-align: left;
  padding-left: 10px;
  color: #72767b;
}

.echarts {
  width: 800px; height: 600px;

}

.casted_value_text {
  margin-left: 5px;
  color: #409eff;
  cursor: pointer;
}

.tabs {
  width: 500px;
}
</style>