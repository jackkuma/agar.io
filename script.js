//環境變數
let updateFPS = 30
let showMouse = true
let time = 0
const bgColor = "black"
const redColor = "#ed1c24"
//GUI控制項
const controls = {
  value: 0,
  showID: true
}
const gui = new dat.GUI()
gui.add(controls,"showID")
//***************************
//2維向量 Vec2
class Vec2 {
  constructor(x,y) {
    this.x = x
    this.y = y
  }
  //設定
  set(x,y) {
    this.x = x
    this.y = y
  }
  //移動
  move(x,y) {
    this.x += x
    this.y += y
  }
  //相加
  add(v){
    return new Vec2(this.x + v.x,this.y + v.y)
  }
  //相減
  sub(v){
    return new Vec2(this.x - v.x,this.y - v.y)
  }
  //縮放
  mul(s){
    return new Vec2(this.x * s,this.y * s)
  }
  //向量相等判斷
  equal(v){
    return this.x == v.x && this.y == v.y
  }
  //複製
  clone() {
    return new Vec2(this.x,this.y)
  }
  //計算屬性
  get length(){
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }
  //設定新長度
  set length(nv){
    let temp = this.unit.mul(nv)
    this.set(temp.x,temp.y)
  }
  //角度計算
  get angle(){
    return Math.atan2(this.y,this.x)
  }
  //單位向量計算
  get unit(){
    return this.mul(1/this.length)
  }
  //字串轉換
  toString(){
    return `(${this.x}, ${this.y})`
  }
}
//*******

const canvas = document.getElementById("myCanvas")
const ctx = canvas.getContext("2d")
//繪製物件
ctx.circle = function(v,r) {
  this.arc(v.x,v.y,r,0,Math.PI*2)
  this.fill()
}
ctx.line = function(v1,v2) {
  this.moveTo(v1.x,v1.y)
  this.lineTo(v2.x,v2.y)
}
//全域控制
const PI = Math.PI
const PI2 = Math.PI * 2
const global = {
  scale: 1,
  width: 4000,
  height: 4000,
  foodMax: 500, //最大球體數
  playerMax: 50, //最大玩家數
  collideFactor: 0 //控制球體合併
}
//速度比例換算
function map(value,min,max,nMin,nMax) {
  let l1 = max - min
  let l2 = nMax - nMin
  let ratio = l2/l1
  return (value-min) * ratio + nMin
}
//玩家設定值
class Player {
  constructor(args) {
    let def = {
      id: parseInt(Math.random()*100000),
      p: new Vec2(0,0),
      v: new Vec2(map(Math.random(),0,1,-5,5),map(Math.random(),0,1,-5,5)),
      a: new Vec2(0,0),
      mass: 100,
      living: true,
      color: `hsl(${Math.random() * 360},60%,50%)`
    }
    Object.assign(def,args)
    Object.assign(this,def)
  }
  draw() {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.p.x,this.p.y,this.r,0,PI2)
    ctx.fill()
    //顯示本身ID
    if(this.type!="food") {
      ctx.font = "150% Arial"
      ctx.fillStyle = "#fff"
      ctx.textAlign = "center"
      ctx.fillText(this.id,this.p.x,this.p.y)
    }
    //顯示追逐目標ID
    if(this.lastTarget && controls.showID) {
      ctx.font = "120% Arial"
      ctx.fillStyle = "#eee"
      ctx.textAlign = "center"
      ctx.fillText(this.lastTarget.id,this.p.x,this.p.y + 20)
    }
  }
  update() {
    this.p.move(this.v.x,this.v.y)
    //this.v.move(this.a.x,this.a.y) //取消更新加速度
    //附予射出食物摩擦力，射出後才能停止
    if(this.type == "food") {
      //this.v = this.v.mul(0.95) //此語法會拖慢整體執行速度
      this.v.x *= 0.95
      this.v.y *= 0.95
    }
    //附予球體摩擦力
    this.a = this.a.mul(0.98)
    //如果重量小於0 該球體非存活狀態
    if(this.mass < 0) {
      this.living = false
    }
    this.checkBoundary()
  }
  //邊界判斷
  checkBoundary() {
    //左右邊界
    if(this.p.x - this.r < -global.width/2) {
      this.p.x = -global.width/2 + this.r
    }
    if(this.p.x + this.r > global.width/2) {
      this.p.x = global.width/2 - this.r
    }
    //上下邊界
    if(this.p.y - this.r < -global.height/2) {
      this.p.y = -global.height/2 + this.r
    }
    if(this.p.y + this.r > global.height/2) {
      this.p.y = global.height/2 - this.r
    }
  }
  //球體互吃機制設定
  eat(target) {
    //花0.1秒將本體重量+吃掉的球體重量
    TweenMax.to(this,0.1,{mass: this.mass + target.mass})
    //被吃的球體死亡(消失)
    target.living = false
  }
  //計算球體大小
  get r() {
    return Math.sqrt(this.mass)
  }
  //計算球體速度
  get maxSpeed() {
    //分母不得為0 所以額外+1
    return 30/(1 + Math.log(this.r))
  }
  //判斷周圍球體是否比本身小 && 是否在範圍內
  isTarget(p) {
    let result = p.r < this.r * 0.9 && p.p.sub(this.p).length < 500
    return result
  }
}
//Canvas初始設定
function initCanvas() {
  ww = canvas.width = window.innerWidth
  wh = canvas.height = window.innerHeight
}
initCanvas()

players = []
myPlayers = []
//邏輯初始化
function init() {
  for(let i = 0; i < 300; i++) {
    players.push(new Player({
      //產生隨機重量
      mass: Math.random() * 1000 + 20,
      //產生隨機位置
      p: new Vec2(map(Math.random(),0,1,-global.width/2,global.width/2),map(Math.random(),0,1,-global.height/2,global.height/2))
    }))
  }
  //產生自己的角色
  myPlayers.push(players[0])
  
  //產生玩家
  setInterval(function() {
    //依玩家球體大小調整縮放比例(值不可為0)
    let scale = 1/Math.log(Math.sqrt(myPlayers[0].r)/4 + 2)
    //花2秒隨球體大小縮放
    TweenMax.to(global,2,{scale: scale})
  },2000)

  //產生食物
  setInterval(function() {
    //控制食物 --過濾(filter)球體類型是food時，小於foodMax才繼續產生food
    if(players.filter(p => p.type == "food").length < global.foodMax) {
      players.push(new Player({
        mass:10,
        p: new Vec2(map(Math.random(),0,1,-global.width/2,global.width/2),map(Math.random(),0,1,-global.height/2,global.height/2)),
        v: new Vec2(0,0),
        type: "food"
      }))
    }

    //控制玩家數量
    if(players.filter(p => p.type!="food").length < global.playerMax) {
      players.push(new Player({
        mass: Math.random() * 1000 + 20,
        p: new Vec2(map(Math.random(),0,1,-global.width/2,global.width/2),map(Math.random(),0,1,-global.height/2,global.height/2))
      }))
    }
  },10)

}
//邏輯更新
function update() {
  time++
  let myPlayer = myPlayers[0]
  
  players.forEach((player,pid) => {
    //先判斷球體是否存活
    if(player.living) {
      player.update()

      //其他球體玩家AI設定
      //除以20餘數取出的ID再乘以5(錯開行進轉換時間) && 不是主體玩家 && 不是food類型
      if((time + pid * 5)%20 == 0 && player.id!=myPlayer.id && player.type!="food") {
        //20%機率
        if(Math.random() < 0.2) {
          //先清除目標
          player.lastTarget = null
          //給予隨機最大速度 每20毫秒改變行進方向
          let angle = PI2 * Math.random()
          let len = player.maxSpeed
          let newV = new Vec2(Math.cos(angle) * len,Math.sin(angle) * len)
          //緩和行進轉換方向
          TweenMax.to(player.v,0.1,newV)
        }

        //30%機率
        if(Math.random() < 0.3) {
          //判斷敵人(過濾周圍的球體是否比本身小)
          let targets = players.filter(t => player.isTarget(t))
          //如果目標陣列符合條件 就追逐並吃掉目標的第0個
          if(targets[0]) {
            player.lastTarget = targets[0]
          }
        }
      } else {
        //如果已有追逐目標 並且目標處於存活狀態
        if(player.lastTarget && player.lastTarget.living) {
          //取得追逐目標座標
          let delta = player.lastTarget.p.sub(player.p)
          //執行本身最大速度
          let newV = delta.unit.mul(player.maxSpeed)
          //執行吃掉動作(只變更x跟y)
          TweenMax.to(player.v,0.2,{x: newV.x,y: newV.y})
        }
      }

      //判斷其他球體玩家
      players.forEach((player2,pid2) => {
        //判斷是否為不同球體、不同ID、存活狀態
        if(pid!=pid2 && player.id!=player2.id && player2.living) {
          //判斷本體是否大於其他球體；且其他球體被本體完全覆蓋
          if(player.r * 0.9 > player2.r && player.p.sub(player2.p).length -10 <= (player.r - player2.r)) {
            player.eat(player2)
          }
        }

      })
    }
  })
  
  //分裂球體是否進行合併
  myPlayers.forEach((c1,c1id) => {
    myPlayers.forEach((c2,c2id) => {
      //判斷分裂球體是否不相同 && 且為存活狀態
      if(c1id!=c2id && c1.living && c2.living) {
        //不能合併時 先判斷主副球體位置
        let delta = c2.p.sub(c1.p)
        //先聚集不合併 判斷主副球距離是否小於球體半徑
        if(delta.length < c1.r + c2.r) {
          //計算出主副球須保持的最小距離(微微交疊)
          let pan = delta.unit.mul((c1.r + c2.r) * global.collideFactor)
          //將距離推給副球體 讓其移出主球體外
          c2.p = c1.p.add(pan)
        }
        //可以合併時 重新計算主副球距離
        delta = c2.p.sub(c1.p)
        //判斷目前為合併狀態(小於0.7) 距離是否小於主副球體半徑相加的0.6倍 且不是主球體
        if(global.collideFactor < 0.7 && delta.length < (c1.r + c2.r) * 0.6 && c2id!=0) {
          //進行合併 讓主副球體重量相加
          c1.mass += c2.mass
          //合併後重新計算球體中心點
          c1.p = c1.p.add(c2.p).mul(0.5)
          //副球體死亡(消失)
          c2.living = false
        }
      }
    })
  })

  //讓分裂的球體跟著本體移動
  myPlayers.forEach((c1,c1id) => {
    //如果不是本體 
    if(c1id!=0) {
      //取出本體位置
      let mdelta = myPlayer.p.sub(c1.p)
      //移動的速度會與距離成反比 距離越遠速度越大 重量越大速度越慢 (100換算5倍比例為20)
      c1.p = c1.p.add(mdelta.unit.mul(map(mdelta.length,0,100,0,20)/Math.sqrt(c1.r)))
      //讓分裂球體也可用滑鼠控制
      let delta = mousePos.sub(new Vec2(ww/2,wh/2)).mul(0.1)
      //如果球體移動速度大於本體速度
      if(delta.length > c1.maxSpeed) {
        //縮減至與本體相同的最大速度
        delta = delta.unit.mul(c1.maxSpeed)
      }
      //分裂出的球體取得本體相同速度 + 加速度(防止球體相黏)
      c1.v = delta
      c1.v = c1.v.add(c1.a)
    }
  })

  //滑鼠控制球體
  let delta = mousePos.sub(new Vec2(ww/2,wh/2)).mul(0.1)
  let deltaLen = delta.length
  //控制球體移動速度
  if(deltaLen > myPlayer.maxSpeed) {
    delta = delta.unit.mul(myPlayer.maxSpeed)
  }
  myPlayer.v = delta

  //過濾(filter)狀態為living的球體才存在畫面
  players = players.filter(p => p.living)
  myPlayers = myPlayers.filter(p => p.living)
  //判斷畫面無主體物件時
  if(myPlayers.length == 0) {
    //過濾所有狀態不是food的球體，重新產生主體物件
    myPlayers.push(players.filter(p => p.type!="food")[0])
  }
}
//畫面繪製更新
function draw() {
  //清空背景
  ctx.fillStyle = bgColor
  ctx.fillRect(0,0,ww,wh)
  //*** 開始繪製 *****************

  let cen = myPlayers[0].p

  ctx.save()
  ctx.translate(ww/2,wh/2)
    ctx.scale(global.scale,global.scale)
    ctx.translate(-cen.x,-cen.y)

    //網格繪製
    let gridWidth = 250
    let gcount = global.width/gridWidth
    for(let i = -gcount/2; i <= gcount/2; i++) {
      ctx.moveTo(i * gridWidth, -global.height/2)
      ctx.lineTo(i * gridWidth, global.height/2)
      ctx.moveTo(-global.height/2, i * gridWidth)
      ctx.lineTo(global.height/2, i * gridWidth)
    }
    ctx.strokeStyle = "rgba(255,255,255,0.4"
    ctx.stroke()
    
    //產生玩家
    //先產生相同新陣列(slice) 依據球體大小排列繪製先後順序(sort)
    players.slice().sort((p1,p2) => p1.r - p2.r).forEach(player => {
      player.draw()
    })
  
  ctx.restore()

  ctx.font = "20px Arial"
  ctx.fillStyle = "#ffcc00"
  //取出所有主體重量 相加總和
  let score = myPlayers.map(p => p.mass).reduce((total,mass) => (total + mass),0)
  //在畫面左上30的位置顯示由重量轉為整數的分數
  ctx.fillText("Score:" + parseInt(score),30,30)
  //************
  //*** 滑鼠物件 *****************
  ctx.fillStyle = redColor
  ctx.beginPath()
  ctx.circle(mousePos,3)
  
  ctx.save()
    ctx.beginPath()
    ctx.translate(mousePos.x,mousePos.y)
    ctx.strokeStyle = redColor
    let len = 20
    ctx.line(new Vec2(-len,0),new Vec2(len,0))
    ctx.fillText(mousePos,10,-10)
    ctx.rotate(Math.PI/2)
    ctx.line(new Vec2(-len,0),new Vec2(len,0))
    ctx.stroke()
  ctx.restore()
  
  //************
  requestAnimationFrame(draw)
}
//頁面載入
function loaded() {
  initCanvas()
  init()
  requestAnimationFrame(draw)
  setInterval(update,1000/updateFPS)
}
//載入+縮放的事件
window.addEventListener("load",loaded)
window.addEventListener("resize",initCanvas)

//建立滑鼠物件
let mousePos = new Vec2(0,0)
let mousePosUp = new Vec2(0,0)
let mousePosDown = new Vec2(0,0)
//滑鼠事件監聽
window.addEventListener("mousemove",mousemove)
window.addEventListener("mouseup",mouseup)
window.addEventListener("mousedown",mousedown)
//滑鼠事件紀錄
function mousemove(evt) {
  mousePos.set(evt.x,evt.y)
  //console.log(mousePos)
}
function mouseup(evt) {
  mousePos.set(evt.x,evt.y)
  mousePosUp = mousePos.clone()
}
function mousedown(evt) {
  mousePos.set(evt.x,evt.y)
  mousePosDown = mousePos.clone()
}

window.addEventListener("keydown", function(evt) {
  //按下空白鍵
  if(evt.key == " ") {
    let newballs = []
    //讓分裂的球先不能合併
    global.collideFactor = 1
    //判斷目前是否有正在進行的計時器
    if(global.splitTimer) {
      //如果有就移除
      clearTimeout(global.splitTime)
    }
    //同時移除正在進行的TweenMax
    TweenMax.killTweensOf(global)
    //設定一個8秒計時器，每經過8s，花10s時間進行合併
    global.splitTimer = this.setTimeout(() => {
      TweenMax.to(global,10,{collideFactor: 0})
    },8000)

    myPlayers.forEach(mp => {
      //如果重量超過400才能分裂
      if(mp.mass > 400) {
        //花0.2秒分裂出本體一半大小的球體
        TweenMax.to(mp,0.2,{mass: mp.mass/2})
        let splitSelf = new Player({
          //id設定相同才知道是自本體分裂
          id: mp.id,
          //分裂出球體重量是本體重量一半
          mass: mp.mass/2,
          //複製出新位置，才不會本體與分裂球體同步移動
          p: mp.p.clone(),
          //朝滑鼠方向分裂出去並加速
          v: mousePos.sub(new Vec2(ww/2,wh/2)).unit.mul(mp.maxSpeed * 2),
          //加速度
          a: mousePos.sub(new Vec2(ww/2,wh/2)).unit.mul(mp.maxSpeed * 2),
          color: mp.color
        })
        //分裂球體推進新陣列
        newballs.push(splitSelf)
      }
    })
    //與現有球體陣列結合
    players = players.concat(newballs)
    //與本身球體陣列結合
    myPlayers = myPlayers.concat(newballs)

  }
  //按下W鍵
  if(evt.key == "w") {
    myPlayers.forEach(mp => {
      //如果本體重量大於200 才可分裂食物
      if(mp.mass > 200) {
        //花0.2秒的時間從本體分裂出食物 每次分裂 重量耗損100
        TweenMax.to(mp,0.2,{mass: mp.mass - 100})
        //取得本體與滑鼠的位差
        let mouseDelta = mousePos.sub(new Vec2(ww/2,wh/2))
        //取得滑鼠角度
        let mouseAngle = mouseDelta.angle
        //食物初始位置(從本體再往外延伸15)
        let initR = mp.r +15
        //產生食物的位置+滑鼠角度方向
        let initPosition = mp.p.add(new Vec2(
          initR * Math.cos(mouseAngle),
          initR * Math.sin(mouseAngle)
        ))
        let args = {
          //朝滑鼠方向分裂出食物
          p: initPosition,
          //以本體速度亂數+15的產生速度
          v: mp.v.mul(1.5).add(mouseDelta.unit.mul(Math.random() * 5 + 10)),
          //分裂出重量80的食物(耗損100)
          mass: 80,
          color: mp.color,
          type: "food"
        }
        players.push(new Player(args))
      }
    })
  }
})