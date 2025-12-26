import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);  // 控制密码可视的状态
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();

    if (username === 'admin' && password === '1') {
      navigate('/dashboard');
    } else if (username === 'user' && password === '1'){
      navigate('/user');
    } else {
      setErrorMessage('用户名或密码错误，请重试。');
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100"  >
      <div className="card p-4 shadow-sm" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-3">
          <h3 className="mb-2">欢迎登录</h3>
          <div className="gradient-line mb-3"></div>
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group mb-3">
            <label htmlFor="username" className="form-label">用户名</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入您的用户名"
              required
            />
          </div>
          <div className="form-group mb-3">
            <label htmlFor="password" className="form-label">密码</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入您的密码"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </div>
          {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
          <button type="submit" className="btn btn-primary w-100">登录</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
