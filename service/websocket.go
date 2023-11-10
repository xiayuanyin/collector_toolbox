package service

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"regexp"
	"strconv"
)

var upgrade = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

const (
	CloseNormalClosure           = 1000
	CloseGoingAway               = 1001
	CloseProtocolError           = 1002
	CloseUnsupportedData         = 1003
	CloseNoStatusReceived        = 1005
	CloseAbnormalClosure         = 1006
	CloseInvalidFramePayloadData = 1007
	ClosePolicyViolation         = 1008
	CloseMessageTooBig           = 1009
	CloseMandatoryExtension      = 1010
	CloseInternalServerErr       = 1011
	CloseServiceRestart          = 1012
	CloseTryAgainLater           = 1013
	CloseTLSHandshake            = 1015
)

type CloseError struct {
	Code int
	Text string
}

func (e *CloseError) Error() string {
	s := []byte("websocket: close ")
	s = strconv.AppendInt(s, int64(e.Code), 10)
	switch e.Code {
	case CloseNormalClosure:
		s = append(s, " (normal)"...)
	case CloseGoingAway:
		s = append(s, " (going away)"...)
	case CloseProtocolError:
		s = append(s, " (protocol error)"...)
	case CloseUnsupportedData:
		s = append(s, " (unsupported data)"...)
	case CloseNoStatusReceived:
		s = append(s, " (no status)"...)
	case CloseAbnormalClosure:
		s = append(s, " (abnormal closure)"...)
	case CloseInvalidFramePayloadData:
		s = append(s, " (invalid payload data)"...)
	case ClosePolicyViolation:
		s = append(s, " (policy violation)"...)
	case CloseMessageTooBig:
		s = append(s, " (message too big)"...)
	case CloseMandatoryExtension:
		s = append(s, " (mandatory extension missing)"...)
	case CloseInternalServerErr:
		s = append(s, " (internal server error)"...)
	case CloseTLSHandshake:
		s = append(s, " (TLS handshake error)"...)
	}
	if e.Text != "" {
		s = append(s, ": "...)
		s = append(s, e.Text...)
	}
	return string(s)
}

var OnlineWebsocketConnections = make(map[string]*websocket.Conn, 128)

type ClientCollector struct {
	Id   string `json:"id"`
	Type string `json:"type"`
}

var WebsocketCollectorMappings = make(map[string]*[]ClientCollector, 128)

func InitWebsocket(c *gin.Context) {
	// 升级成 websocket 连接
	ws, err := upgrade.Upgrade(c.Writer, c.Request, nil)
	connUuid := uuid.New().String()
	OnlineWebsocketConnections[connUuid] = ws
	if err != nil {
		log.Fatalln(err)
	}
	// 完成时关闭连接释放资源
	defer ws.Close()
	go func() {
		// 监听连接“完成”事件，其实也可以说丢失事件
		<-c.Done()
		fmt.Println("websocket done, uuid:", connUuid)
		// 这里也可以做用户在线/下线功能
		WebsocketOffline(connUuid)
	}()
	for {
		// 读取客户端发送过来的消息，如果没发就会一直阻塞住
		mt, message, err := ws.ReadMessage()
		if err != nil {
			WebsocketOffline(connUuid)
			fmt.Println(err.(*websocket.CloseError))
			break
		}
		if string(message) == "ping" {
			message = []byte("pong")
			err = ws.WriteMessage(mt, message)
			if err != nil {
				fmt.Println(err.(*websocket.CloseError))
				break
			}
		} else if mt == websocket.TextMessage {
			_ = WebsocketReceiverHandler(connUuid, message)
		} else {
			fmt.Println("unknown websocket message type", mt)
		}

	}
}
func WebsocketReceiverHandler(wsId string, msg []byte) error {
	//fmt.Println("websocket message", string(msg))
	reg1 := regexp.MustCompile(`^(\w+)\|(.*)$`)
	matches := reg1.FindStringSubmatch(string(msg))
	//fmt.Println("matches", matches)
	if len(matches) < 2 {
		return fmt.Errorf("socket message parse error")
	}
	switch matches[1] {
	case "modbus_write":
		var m ModbusWriteMessage
		err := json.Unmarshal([]byte(matches[2]), &m)
		if err != nil {
			return fmt.Errorf("modbus_write message json parse error")
		}
		return WriteModbus(&m)
	case "online":
		var collector ClientCollector
		err := json.Unmarshal([]byte(matches[2]), &collector)
		if err != nil {
			return fmt.Errorf("online message json parse error")
		}
		if WebsocketCollectorMappings[wsId] == nil {
			collectors := make([]ClientCollector, 0)
			WebsocketCollectorMappings[wsId] = &collectors
		}
		collectors := *WebsocketCollectorMappings[wsId]
		//fmt.Println("origin message", string(msg))
		collectors = append(collectors, collector)
		WebsocketCollectorMappings[wsId] = &collectors
		//fmt.Println("this online", collector)
		//fmt.Println("restored online", WebsocketCollectorMappings)
		return nil
	default:
		return fmt.Errorf("unknown message type %s", string(msg))
	}
}

func BroadcastMessage(topic string, message []byte) {
	defer func() {
		r := recover()
		if r != nil {
			fmt.Println("recover: ", r)
		}

	}()
	fullMessage := []byte(topic + "|" + string(message))
	for k, conn := range OnlineWebsocketConnections {
		if conn == nil {
			delete(OnlineWebsocketConnections, k)
			continue
		}
		err := conn.WriteMessage(websocket.TextMessage, fullMessage)
		if err != nil {
			fmt.Println(err)
			delete(OnlineWebsocketConnections, k)
			continue
		}
	}

}

func WebsocketOffline(id string) {
	conn := OnlineWebsocketConnections[id]
	if conn != nil {
		delete(OnlineWebsocketConnections, id)
	}
	collectors := WebsocketCollectorMappings[id]
	if collectors != nil {
		//fmt.Println("offline", id, ", collectors: ", *collectors)
		if len(*collectors) > 0 {
			//fmt.Println("offline", id, ", collectors: ", collectors)
			for _, collector := range *collectors {
				switch collector.Type {
				case "modbus":
					EndModbusConnection(collector.Id)
				}
			}
		}
		delete(WebsocketCollectorMappings, id)
	}

}
