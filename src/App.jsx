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
                <Route path='/tracks/global-investing' element={<div>Global Investing - Coming Soon</div>}/>
                <Route path='/tracks/travel' element={<div>Travel - Coming Soon</div>}/>
                <Route path='/studio/car-vs-invest' element={<div>Car vs Invest - Coming Soon</div>}/>
                <Route path='/studio/offshore' element={<div>Offshore Investing - Coming Soon</div>}/>

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
