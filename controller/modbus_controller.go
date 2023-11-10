package controller

import (
	"conn_tools/service"
	"github.com/gin-gonic/gin"
	"github.com/xiayuanyin/go_modbus"
	"net/http"
)

type JSON = gin.H

type ModbusClientConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	SlaveId  byte   `json:"slave_id"`
	UseUDP   bool   `json:"udp"`
	Interval int    `json:"interval"`
}

func ConnectModbus(c *gin.Context) {
	var json ModbusClientConfig
	// 将request的body中的数据，自动按照json格式解析到结构体
	if err := c.ShouldBindJSON(&json); err != nil {
		// 返回错误信息
		// gin.H封装了生成json数据的工具
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cli := &go_modbus.ModbusPort{
		Host:    json.Host,
		Port:    json.Port,
		SlaveId: json.SlaveId,
		UseUDP:  json.UseUDP,
	}
	if err := cli.Connect(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	id := service.CreateClient(cli, json.Interval)
	c.JSON(http.StatusOK, JSON{"id": id})
}

func DisconnectModbus(c *gin.Context) {
	id := c.Query("id")
	service.EndModbusConnection(id)
	c.JSON(http.StatusOK, JSON{"message": "success"})
}

func SetModbusReaders(c *gin.Context) {
	id := c.Query("id")
	var readers []service.ModbusAddress
	if err := c.ShouldBindJSON(&readers); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	service.SetModbusReaders(id, readers)
	c.JSON(http.StatusOK, JSON{"message": "success"})
}

func WriteModbus(c *gin.Context) {
	id := c.Query("id")
	var writeMsg service.ModbusWriteMessage
	if err := c.ShouldBindJSON(&writeMsg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if id != "" {
		writeMsg.Id = id
	}
	err := service.WriteModbus(&writeMsg)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, JSON{"message": "success"})
}
