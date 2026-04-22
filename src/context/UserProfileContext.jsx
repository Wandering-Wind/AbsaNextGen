import { createContext, useContext, useState } from "react";

const UserProfileContext = createContext();


//Default values to test
const defaultProfile = {
    grossIncome: 0,
    raPercent: 8,
    rent: 0,
    utilities: 0,
    medicalAid: 0,
    carPayment: 0,
    loanPayment: 0,
    tfsaContribution: 0,
    bankBalance: 0,
    entertainment: 0,
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