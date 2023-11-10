package service

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	. "github.com/xiayuanyin/go_modbus"
	"time"
)

type ModbusAddress struct {
	SlaveId byte   `json:"slave_id"`
	Table   string `json:"table"`
	Address uint16 `json:"address"`
	Length  int    `json:"length"`
}
type ModbusReader struct {
	ModbusClient *ModbusPort
	Addresses    []ModbusAddress
	Interval     int
	Terminate    bool
}

var ModbusClientMappings = map[string]*ModbusReader{}

func CreateClient(cli *ModbusPort, interval int) string {
	randomId := uuid.New().String()
	reader := ModbusReader{
		ModbusClient: cli,
		Interval:     interval,
	}
	ModbusClientMappings[randomId] = &reader
	go StartLoopRead(randomId)
	return randomId
}

type ModbusReadResult struct {
	Id      string `json:"id"`
	Type    string `json:"type"`
	SlaveId byte   `json:"slave_id"`
	Table   string `json:"table"`
	Address int    `json:"address"`
	Length  int    `json:"length"`
	During  int    `json:"during"`
	Data    []int  `json:"data"`
	Buffer  []byte `json:"buffer"`
	Error   string `json:"error"`
}

func StartLoopRead(id string) {
	reader := ModbusClientMappings[id]
	if reader.ModbusClient == nil {
		fmt.Println("cli is nil", id)
		return
	}

	for {
		if reader.ModbusClient == nil {
			fmt.Println("cli is nil", id)
			return
		}
		if reader.ModbusClient.IsConnected() == false {
			fmt.Println("cli is not connected", id)
			j := gin.H{"id": id, "type": "modbus_closed", "message": "not connected"}
			b, _ := json.Marshal(j)
			BroadcastMessage("message", b)
			return
		}
		for _, address := range reader.Addresses {
			var res ModbusReadResult
			res.Type = "modbus_read"
			res.Id = id
			res.Table = address.Table
			res.Address = int(address.Address)
			res.Length = address.Length
			res.SlaveId = address.SlaveId
			if res.SlaveId == 0 {
				res.SlaveId = 1
			}
			var err error
			startTime := time.Now()
			switch address.Table {
			case "coils":
				d, err1 := reader.ModbusClient.ReadCoilsWithSlaveId(res.SlaveId, address.Address, uint16(address.Length))
				res.Buffer = d.Buffer
				res.Data = make([]int, len(d.Data))
				for i, v := range d.Data {
					if v {
						res.Data[i] = 1
					} else {
						res.Data[i] = 0
					}
				}
				err = err1
			case "discrete_inputs":
				d, err1 := reader.ModbusClient.ReadDiscreteInputsWithSlaveId(res.SlaveId, address.Address, uint16(address.Length))
				res.Buffer = d.Buffer
				res.Data = make([]int, len(d.Data))
				for i, v := range d.Data {
					if v {
						res.Data[i] = 1
					} else {
						res.Data[i] = 0
					}
				}
				err = err1
			case "holding_registers":
				d, err1 := reader.ModbusClient.ReadHoldingRegistersWithSlaveId(res.SlaveId, address.Address, uint16(address.Length))
				res.Buffer = d.Buffer
				res.Data = make([]int, len(d.Data))
				for i, v := range d.Data {
					res.Data[i] = int(v)
				}
				err = err1
			case "input_registers":
				d, err1 := reader.ModbusClient.ReadInputRegistersWithSlaveId(res.SlaveId, address.Address, uint16(address.Length))
				res.Buffer = d.Buffer
				res.Data = make([]int, len(d.Data))
				for i, v := range d.Data {
					res.Data[i] = int(v)
				}
				err = err1
			}
			res.During = (time.Now().Nanosecond() - startTime.Nanosecond()) / 1e6
			if err != nil {
				res.Error = err.Error()
			}
			buf, _ := json.Marshal(res)
			BroadcastMessage("message", buf)

		}
		if reader.Interval < 10 {
			reader.Interval = 10
		}
		time.Sleep(time.Duration(reader.Interval) * time.Millisecond)
		if reader.Terminate {
			fmt.Println("terminate loop read", id)
			return
		}
	}

}

func SetModbusReaders(id string, addresses []ModbusAddress) {
	reader := ModbusClientMappings[id]
	if reader != nil {
		reader.Addresses = addresses
		//ModbusClientMappings[id] = reader
	}
}

type ModbusWriteMessage struct {
	Id        string   `json:"id"`
	SlaveId   byte     `json:"slave_id"`
	Table     string   `json:"table"`
	Address   uint16   `json:"address"`
	DataArray []uint16 `json:"data_array"`
}

func WriteModbus(msg *ModbusWriteMessage) error {
	cli := ModbusClientMappings[msg.Id]
	if cli == nil {
		return fmt.Errorf("client not found")
	}
	switch msg.Table {
	case "coils":
		data := make([]bool, len(msg.DataArray))
		for i, v := range msg.DataArray {
			if v == 1 {
				data[i] = true
			} else {
				data[i] = false
			}
		}
		return cli.ModbusClient.WriteCoilsWithSlaveId(msg.SlaveId, msg.Address, data)
	case "holding_registers":
		return cli.ModbusClient.WriteHoldingRegistersWithSlaveId(msg.SlaveId, msg.Address, msg.DataArray)
	default:
		return fmt.Errorf("table not found %v", msg)
	}
}

func EndModbusConnection(id string) {
	cli := ModbusClientMappings[id]
	if cli == nil {
		fmt.Println("cli is nil", id)
		return
	}

	fmt.Println("Terminate", id)
	cli.Terminate = true
	ModbusClientMappings[id] = cli
	_ = cli.ModbusClient.Disconnect()
	delete(ModbusClientMappings, id)
}
