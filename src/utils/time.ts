import dgram from 'dgram';

export function getNictTime(): Promise<Date> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    
    // NTPパケット (48バイト) の生成
    // 最初のバイトに 0x1b (LI: 0, VN: 3, Mode: 3 = Client) を設定します
    const packet = Buffer.alloc(48);
    packet[0] = 0x1b;
    
    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('NTP request timed out'));
    }, 4000);
    
    client.on('error', (err) => {
      clearTimeout(timeout);
      client.close();
      reject(err);
    });
    
    client.on('message', (msg) => {
      clearTimeout(timeout);
      client.close();
      
      // 受信データからタイムスタンプを抽出します (Transmit Timestamp は 40〜47 バイト目)
      // 整数部秒 (40〜43 バイト目)
      const sec = msg.readUInt32BE(40);
      
      // 1900年1月1日からの経過秒数をUNIXエポック（1970年1月1日）からの秒数に変換します
      // 差分は 2208988800 秒です
      const ntpEpochDiff = 2208988800;
      const unixTimeMs = (sec - ntpEpochDiff) * 1000;
      
      resolve(new Date(unixTimeMs));
    });
    
    client.send(packet, 0, packet.length, 123, 'ntp.nict.jp', (err) => {
      if (err) {
        clearTimeout(timeout);
        client.close();
        reject(err);
      }
    });
  });
}
