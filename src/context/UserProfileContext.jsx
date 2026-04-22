import { createContext, useContext, useState } from "react";

const UserProfileContext = createContext();


//Default values to test
const defaultProfile = {
    grossIncome: 45000,
    raPercent: 18,
    rent: 15000,
    utilities: 2000,
    medicalAid: 3000,
    carPayment: 0,
    loanPayment: 0,
    tfsaContribution: 3833,
    bankBalance: 50000,
    entertainment: 3000,
}

export function UserProfileProvider({ children }) {
    const [profile, setProfile] = useState(defaultProfile);

    function updateProfile(field, value) {
        setProfile(prev => ({...prev, [field]: value}))
    }

    function resetProfile(){
        setProfile(defaultProfile)
    }

    return(
        <UserProfileContext.Provider value={{profile, updateProfile, resetProfile}}>
            {children}
        </UserProfileContext.Provider>
    )
}

export function useUserProfile(){
    const ctx = useContext(UserProfileContext)
    if (!ctx) throw new Error ("useUserProfile must be used inside UserProfileProvider")
        return ctx
}

export default UserProfileContext;