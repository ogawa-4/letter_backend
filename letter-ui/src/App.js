//置き手紙システムのフロントエンド
//Reactを用いて、入力内容をFastAPIにPOSTし、保存された手紙をすべてGETして表示する 

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const API_BASE_URL = 'https://letter-backend-eqrq.onrender.com';

// Leaflet のマーカーの見た目を修正（画像が表示されない対策）
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


function App() {
  const [content, setContent] = useState(''); //手紙の内容
  const [latitude, setLatitude] = useState(''); //緯度（入力は文字列として受け取る）
  const [longitude, setLongitude] = useState(''); //経度
  const [message, setMessage] = useState(''); //サーバから帰ってきたメッセージ
  const [letters, setLetters] = useState([]); //手紙の一覧

  //手紙送信の関数
  //fetchを用いて、POSTリクエストを送信、レスポンスをmessageに格納
  const postLetter = async () => {
    const response = await fetch(`${API_BASE_URL}/letters/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, latitude: parseFloat(latitude), longitude: parseFloat(longitude) }),
    });
    const data = await response.json();
    setMessage(data.message);
  };

  //すべての手紙取得の関数
  const getLetters = async () => {
    const response = await fetch(`${API_BASE_URL}/letters/`);
    const data = await response.json();
    setLetters(data.letters);
  };

  //現在位置を取得して、自動で緯度経度を入力する関数
  //Geolocation APIを使用して、現在地の緯度経度を取得
  const getCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      (error) => {
        console.error("位置情報の取得に失敗:", error);
        setMessage("位置情報の取得に失敗");
      }
    );
  } else {
    setMessage("このブラウザは位置情報に対応していません");
  }
};


  return (
    <div style={{ padding: '2rem' }}>
      <h1>置き手紙システム</h1>
      <textarea
        placeholder="内容を入力"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        style={{ width: '100%' }}
      />
      <input
        type="text"
        placeholder="緯度"
        value={latitude}
        onChange={(e) => setLatitude(e.target.value)}
        style={{ marginRight: '1rem' }}
      />
      <input
        type="text"
        placeholder="経度"
        value={longitude}
        onChange={(e) => setLongitude(e.target.value)}
      />
      <div style={{ marginTop: '1rem' }}>
        <button onClick={postLetter}>手紙を残す</button>
        <button onClick={getLetters} style={{ marginLeft: '1rem' }}>すべての手紙を表示</button>
        <button onClick={getCurrentLocation}>現在地を取得</button>
      </div>
      {message && <p>{message}</p>}
      <ul>
        {letters.map((letter) => (
          <li key={letter.id}>
            <strong>{letter.content}</strong><br />
            緯度: {letter.latitude}, 経度: {letter.longitude}
          </li>
        ))}
      </ul>
      <MapContainer
  center={[35.6895, 139.6917]} // 初期表示位置（東京）
  zoom={13}
  style={{ height: '400px', width: '100%', marginTop: '2rem' }}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
  />
  {letters.map((letter) => (
    <Marker
      key={letter.id}
      position={[letter.latitude, letter.longitude]}
    >
      <Popup>{letter.content}</Popup>
    </Marker>
  ))}
</MapContainer>

    </div>
  );
}

export default App;
