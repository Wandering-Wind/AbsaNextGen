import './App.css'
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MoneySnapshot from './pages/MoneySnapshot';
import FirstPropertyPath from './pages/FirstPropertyPath';
import PropertyVsRent from './pages/PropertyVsRent';


import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import PageWrapper from './components/layout/PageWrapper';
import { UserProfileProvider } from './context/UserProfileContext';


function App() {
  return(
    <div>
      <AuthProvider>
        <UserProfileProvider>
          <BrowserRouter>
            <Routes>
              <Route path='/' element={<LoginPage/>}/>
              
              <Route element={<RequireAuth><PageWrapper/></RequireAuth>}>
                <Route path='/home' element={<HomePage/>}/>
                <Route path='/dashboard' element={<MoneySnapshot/>}/> 
                <Route path='/tracks/property' element={<FirstPropertyPath/>}/>
                <Route path='/studio/rent-vs-buy' element={<PropertyVsRent/>}/>
                <Route path='/tracks/global-investing' element={<div> <h2 style={{textAlign: 'center'}}>Global Investing - Coming Soon</h2></div>}/>
                <Route path='/tracks/travel' element={<div><h2 style={{textAlign: 'center'}}>Travel - Coming Soon</h2></div>}/>
                <Route path='/studio/car-vs-invest' element={<div><h2 style={{textAlign: 'center'}}>Car vs Invest - Coming Soon</h2></div>}/>
                <Route path='/studio/offshore' element={<div> <h2 style={{textAlign: 'center'}}>Offshore Investing - Coming Soon</h2></div>}/>

              </Route>
            </Routes>
          </BrowserRouter>
        </UserProfileProvider>
      </AuthProvider>
      {/* should dashboard URL be money-snapshot or is dashboard fine?*/}
    </div>
  )
}

export default App
