import './App.css'
import LoginPage         from './pages/LoginPage';
import OnboardingPage    from './pages/OnboardingPage';
import HomePage          from './pages/HomePage';
import MoneySnapshot     from './pages/MoneySnapshot';
import FirstPropertyPath from './pages/FirstPropertyPath';
import PropertyVsRent    from './pages/PropertyVsRent';
import GlobalInvesting   from './pages/GlobalInvesting';
import TravelTrack       from './pages/TravelTrack';
import CarVsInvest       from './pages/CarVsInvest';
import OffshoreStudio    from './pages/OffshoreStudio';

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider }        from './context/AuthContext';
import RequireAuth             from './components/RequireAuth';
import PageWrapper             from './components/layout/PageWrapper';
import { UserProfileProvider } from './context/UserProfileContext';
import { NudgeProvider }       from './context/NudgeContext';

function App() {
    return (
        <AuthProvider>
            <UserProfileProvider>
                <NudgeProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path='/'           element={<LoginPage/>}/>
                        <Route path='/onboarding' element={<OnboardingPage/>}/>

                        <Route element={<RequireAuth><PageWrapper/></RequireAuth>}>
                            <Route path='/home'                    element={<HomePage/>}/>
                            <Route path='/dashboard'               element={<MoneySnapshot/>}/>
                            <Route path='/tracks/property'         element={<FirstPropertyPath/>}/>
                            <Route path='/studio/rent-vs-buy'      element={<PropertyVsRent/>}/>
                            <Route path='/tracks/global-investing' element={<GlobalInvesting/>}/>
                            <Route path='/tracks/travel'           element={<TravelTrack/>}/>
                            <Route path='/studio/car-vs-invest'    element={<CarVsInvest/>}/>
                            <Route path='/studio/offshore'         element={<OffshoreStudio/>}/>
                        </Route>
                    </Routes>
                </BrowserRouter>
                </NudgeProvider>
            </UserProfileProvider>
        </AuthProvider>
    )
}

export default App
