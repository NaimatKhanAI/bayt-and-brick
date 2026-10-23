import { randomBytes } from 'node:crypto'

export function notificationService(db, save) {
  db.pushDevices ||= []
  db.pushOutbox ||= []
  const enabled=process.env.PUSH_ENABLED==='true'
  function queue(customerId, notificationId) {
    if(!enabled || !db.customers.some(c=>c.id===customerId&&c.active&&c.notifications)) return
    for(const device of db.pushDevices.filter(d=>d.customerId===customerId)) db.pushOutbox.push({id:randomBytes(12).toString('hex'),token:device.token,customerId,notificationId,state:'pending',attempts:0,nextAt:Date.now()})
  }
  const headers={'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:`Bearer ${process.env.EXPO_ACCESS_TOKEN}`}:{})}
  async function post(route,body) {
    const response=await fetch('https://exp.host/--/api/v2/push/'+route,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(10000)})
    if(!response.ok) throw new Error('Push service unavailable')
    const data=await response.json(); if(data.errors) throw new Error('Push service rejected request'); return data.data
  }
  let running=false
  async function flush() {
    if(!enabled||running)return
    running=true
    try {
      for(const item of db.pushOutbox.filter(x=>['pending','receipt'].includes(x.state)&&x.nextAt<=Date.now()).slice(0,20)) {
        if(!db.pushDevices.some(d=>d.token===item.token&&d.customerId===item.customerId)||!db.customers.some(c=>c.id===item.customerId&&c.active&&c.notifications)) {item.state='cancelled';continue}
        try {
          if(item.state==='pending') {
            // Avoid personal information in lock-screen notifications.
            const ticket=await post('send',{to:item.token,title:'HolidayZone update',body:'Open HolidayZone to see an update to your request.',data:{notificationId:item.notificationId},sound:'default'})
            if(ticket.status==='ok') {item.state='receipt';item.ticket=ticket.id;item.nextAt=Date.now()+900000}
            else { if(ticket.details?.error==='DeviceNotRegistered')db.pushDevices=db.pushDevices.filter(d=>d.token!==item.token);item.state='failed';item.error=ticket.details?.error||'Push rejected' }
          } else {
            const receipts=await post('getReceipts',{ids:[item.ticket]}),receipt=receipts[item.ticket]
            if(!receipt) throw new Error('Receipt unavailable')
            item.state=receipt.status==='ok'?'delivered':'failed'
            if(receipt.details?.error==='DeviceNotRegistered')db.pushDevices=db.pushDevices.filter(d=>d.token!==item.token)
          }
        } catch {item.attempts++;item.nextAt=Date.now()+Math.min(3600000,30000*2**item.attempts);if(item.attempts>=8)item.state='failed'}
      }
      await save()
    } finally {running=false}
  }
  if(enabled){const timer=setInterval(()=>{void flush().catch(()=>{})},30000);timer.unref()}
  return {queue}
}
