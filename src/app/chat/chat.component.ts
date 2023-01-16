import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from './models/mensaje';


//211

//1.- PARA Q ESTO NO DIERA ERROR, FUI AL TSCONFIG Y TODO LO Q DIJERA STRICT LO PUSE EN FALSE.
//2.-ASIGNA EL SOCKJS AL STOMP PARA QUE EL STOMP TRABAJA POR DEBAJO CON SOCKJS.
//3.-SE LE PASA LA RUTA HACIA EL BROKER. LA MISMA Q SE CONFIGURO EN SPRING, EN WEBSOCKETCONFIG.JAVA. A ESTA MISMA CONECCION SE VAN A ENVIAR Y RECIBIR LOS MENSAJES.
//4.-EVENTOS QUE SE DEBEN ESCUCHAR, CUANDO UNO SE CONECTA O DESCONECTA.
  //onConnect : ES UN EVENTO. DESTRO DE LAS LLAVES SE PUEDE EJECUTAR CUALQUIER TAREA CUANDO UNO SE CONECTA.
  //this.client.connected : CONECTED ES UN ATRIBUTO BOOLEAN Q RETORNA SI ESTAMOS O NO CONECTADOS.
  //frame : CONTIENE TODA LA INFORMACIÓN DE CONEXIÓN QUE TENEMOS CON EÑ BROKER.
//5.-CON ESTO SE INICIALIZA LA CONEXIÓN.

//6.- SE HECHA A andar EL PROYECTO Y SALE ESTE ERROR EN LA CONSOLA : "global is not defined". ESTO SE ARREGLA DEFINIENDO ESTA VARIABLE GLOBAL EN POLYFILLS.TS, PARA Q SEA COMPATIBLE CON TODOS LOS NAVEGADORES.

//7.-EVENTO EN CASO DE DESCONECTARSE.
//8.-SE SUSCRIBE AL EVENTO DEL CHAT. SE PASA EL NOMBRE DEL EVENTO Y UNA FUNCION DE FLECHA DE RETORNO DONDE SE VA A ESCUCHAR CADA VEZ Q SE RECIBA UN MENSAJE DESDE EL SERVIDOR.
  //8.1.-SE OBTIENE EL MENSAJE y LUEGO SE AGREGA A LA LISTA.

//9.-EL ARGUMENTO DE PUBLISH ES UN OBJ, POR ESO VA CON LLAVES. ESTE OBJ TIENE ATRIBUTOS.
  //destination : HACE REFERENCIA AL @MESSAGEMAPPING DEL CONTROLADOR EN EL BACK. EL PREFIJO "APP" ES EL Q SE PUSO EN LA CLASE WEBSOCKETCONFIG DEL BACK.
  //body : CUERPO DEL MENSAJE Q SE VA A ENVIAR. stringify : SE PASA A STRING.

//10.-NOTIFICAR AL SERVIDOR EL NOMBRE DE USUARIO, PARA Q ESTE DE AVISO A LOS OTROS USUARIOS QUE SE CONECTÓ EL USUARIO.
//11.-SE LE ASIGNA UN COLOR AL NUEVO USUARIO Q SE CONECTÓ.
  // IF(SI EL COLOR DEL CLIENTE ACTUAL NO ESTÁ DEFINIDO && ES NUEVO_USUARIO && VERIFICA QUE NUESTRO USUARIO SEA EL MISMO AL USUARIO Q SE ESTÁ RECIBIENDO, PARA CAMBIAR EL COLOR.)
  //11.1.-SE ASIGNA  El COLOR A NUESTRA SESIÓN. EL COLOR ALEATORIO DESDE EL BACK.

//12 : ENVÍA AL BROKER EL NOMBRE DE USUARIO Q ESTÁ ESCRIBIENDO.

//13.- ESCUCHAR EL EVENTO DE CUANDO ALGUIEN ESTÁ ESCRIBIENDO. EL MENSAJE DE "ESCRIBIENDO" Q APAREZCA SOLO POR 3000 MILISEGUNDOS Y LUEGO SE RESETEA.

//14.- SE GENERA EL ID DEL USUARIO USANDO DATE. TOMANDO LA HORA DE INGRESO DEL USUARIO CON LOS MILISEGUNDOS. SE USA ESO YA Q ES DIFICIL Q MÁS DE UN USUARIO COINCIDA EN LOS MILISEGUNDOS. Y SE PONE UN RANDOM POR SI ES Q 2 WEONES SE LLEGAN A CONECTAR AL MISMO TIEMPO.
  //Math.random().toString(36) : EL 36 ES LA BASE DEL DECIMAL Q SE VA A FORMAR. ESTE PUEDE SER ENTRE 2 Y 36.      substr(2) : Y SE LE QUITA EL 0 Y LA COMA DE ADELANTE, PA Q QUEDEN LOS NUMEROS.

//15.-SE LLAMA AL CONTROLADOR Y SE PASA EL CLIENTE ID .
//16.-LA FECHA VIENE COMO UN LONG Y EN MILISEGUNDOS Y HAY Q PASARLA A UN TIPO DE JAVASCRIPT. PARA ESTO SE USA UN MAP(). POR CADA MENSAJE SE CONVIERTE LA FECHA.
//17.-SE USA REVERSE() PARA Q DAR VUELTA LA LISTA CON LOS MENSAJES... PA DEJAR EL MÁS NUEVO AL FINAL.
//18.-SE NOTIFICA AL BROKER Q QUEREMOS RECIBIR LOS ULTIMOS 10 MENSAJES DEL HISTORIAL.
//19.-CADA VEZ QUE EL  CLIENTE SE DESCONECTA , SE RESETEAN LOS MENSAJES Y EL ATRIBUTO MENSAJE.


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {


  constructor() {
    this.clienteId = 'id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substr(2);
  }


  ngOnInit(): void {
    this.client = new Client();
    //2
    this.client.webSocketFactory = ()=> {
      //3
      return new SockJS("http://localhost:8080/chat-websocket");
    }

    //4
    this.client.onConnect = (frame) => {
      console.log('Conectados: ' + this.client.connected + ' : ' + frame);
      this.conectado = true;
      //8
      this.client.subscribe('/chat/mensaje', e => {
        let mensaje : Mensaje =  JSON.parse(e.body) as Mensaje //8.1
        mensaje.fecha = new Date(mensaje.fecha);

        //11
        if(!this.mensaje.color && mensaje.tipo=='NUEVO_USUARIO' && this.mensaje.username == mensaje.username){
          this.mensaje.color = mensaje.color; //11.1
        }

        this.mensajes.push(mensaje);
        console.log(mensaje);
      });

      //13
      this.client.subscribe('/chat/escribiendo', e => {
        this.escribiendo = e.body;
        setTimeout(()=>{
          this.escribiendo = '';
        },3000);
      });


      //15
      console.log(this.clienteId);
      this.client.subscribe('/chat/historial/'+ this.clienteId, e => {
        const historial = JSON.parse(e.body) as Mensaje[];
                        //16
        this.mensajes = historial.map(m => {
          m.fecha = new Date(m.fecha);
          return m;
        }).reverse(); //17
      });

      //18
      this.client.publish({destination : '/app/historial', body : this.clienteId});


      //10
      this.mensaje.tipo = 'NUEVO_USUARIO';
      this.client.publish({destination : '/app/mensaje', body : JSON.stringify(this.mensaje)});

    }

    //7
    this.client.onDisconnect = (frame) => {
      console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);
      this.conectado = false;

      //19
      this.mensaje = new Mensaje();
      this.mensajes = []
    }

  }


  conectar() : void {
    this.client.activate(); //5
  }

  desconectar() : void {
    this.client.deactivate();
  }

  enviarMensaje() : void {
    this.mensaje.tipo = 'MENSAJE';
    this.client.publish({destination : '/app/mensaje', body : JSON.stringify(this.mensaje)});  //9
    this.mensaje.texto = ''; //SE RESETEA
  }

  //12
  escribiendoEvento() : void {
    this.client.publish({destination : '/app/escribiendo', body : this.mensaje.username});
  }


  private client : Client;    //1
  conectado : boolean = false;
  mensaje : Mensaje = new Mensaje();
  mensajes : Mensaje[] = [];
  escribiendo : string;
  clienteId : string;

}
