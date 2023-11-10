package main

import (
	"conn_tools/router"
	"embed"
	"fmt"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	. "github.com/xiayuanyin/go_modbus"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {

	// Create an instance of the app structure
	app := NewApp()

	var cli ModbusClient = &ModbusPort{
		Host:    "127.0.0.1",
		Port:    1502,
		SlaveId: 1,
	}
	cErr := cli.Connect()
	if cErr != nil {
		fmt.Println("modbus connect error:", cErr)
	} else {
		d, _ := cli.ReadHoldingRegisters(0, 10)
		fmt.Println("modbus read:", d.Data)
	}

	//r := gin.Default()
	//// 2.绑定路由规则，执行的函数
	//// gin.Context，封装了request和response
	//r.GET("/", func(c *gin.Context) {
	//	c.String(http.StatusOK, "hello World!")
	//})
	// 3.监听端口，默认在8080
	// Run("里面不指定端口号默认为8080")
	go func() {
		fmt.Println("----listen start----")
		r := router.InitRouter()
		r.Run(":3021")
		fmt.Println("----listen ok----")
	}()

	// Create application with options

	err := wails.Run(&options.App{
		Title:  "wails_desktop_1",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
