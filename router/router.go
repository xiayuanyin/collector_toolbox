package router

import (
	"conn_tools/controller"
	"conn_tools/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

func Cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", "*") // 可将将 * 替换为指定的域名
			c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
			c.Header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
			c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type")
			//c.Header("Access-Control-Allow-Credentials", "true")
		}
		if method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
		}
		c.Next()
	}
}
func InitRouter() *gin.Engine {
	router := gin.Default()
	router.Use(Cors())
	router.POST("/modbus/connect", controller.ConnectModbus)
	router.POST("/modbus/disconnect", controller.DisconnectModbus)
	router.POST("/modbus/set_readers", controller.SetModbusReaders)
	router.POST("/modbus/write", controller.WriteModbus)
	router.GET("/ws", service.InitWebsocket)
	return router
}
