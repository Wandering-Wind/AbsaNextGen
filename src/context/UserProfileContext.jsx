import { createContext, useContext, useState, useEffect } from "react";

const UserProfileContext = createContext();

/* Same keys as AuthContext - UserProfileContext reads from the same store */
const USERS_KEY   = 'absa_users'
const CURRENT_KEY = 'absa_current_email'

/* Default profile - all zeros so calculations return 0 instead of NaN
   when a user hasn't filled anything in yet */
const defaultProfile = {
    grossIncome:      0,
    raPercent:        8,
    otherIncome:      [],  /* array of { type, amount } from onboarding / snapshot */
    rent:             0,
    utilities:        0,
    medicalAid:       0,
    carPayment:       0,
    loanPayment:      0,
    tfsaContribution: 0,
    bankBalance:      0,
    entertainment:    0,
}

export function UserProfileProvider({ children }) {
    const [profile, setProfile] = useState(defaultProfile);

    /* Load profile from localStorage on mount.
       Just incase someone refreshes the page by mistake, their data comes back */
    useEffect(() => {
        loadProfileFromStorage();
    }, []);

    /* Reads the current user's financial profile out of localStorage */
    function loadProfileFromStorage() {
        const email    = localStorage.getItem(CURRENT_KEY);
        if (!email) return;

        const users    = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
        const userData = users[email];

        if (userData?.profile) {
            /* Spread defaultProfile first so any fields added in the future
               still get a safe default value even on old stored data */
            setProfile({ ...defaultProfile, ...userData.profile });
        }
    }

    /* Writes the updated profile back into the user's record in localStorage.
       Called every time updateProfile runs - so changes are always persisted */
    function saveProfileToStorage(updatedProfile) {
        const email = localStorage.getItem(CURRENT_KEY);
        if (!email) return;

        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
        if (!users[email]) return;

        users[email].profile = updatedProfile;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    /* updateProfile - called whenever a user changes a field in any form.
       Takes a field name (string) and its new value.
       Example: updateProfile('grossIncome', 45000) */
    function updateProfile(field, value) {
        setProfile(prev => {
            const updated = { ...prev, [field]: value };
            saveProfileToStorage(updated);
            return updated;
        });
    }

    /* resetProfile - clears all financial data back to zeros.
       Used by the reset button in Money Snapshot */
    function resetProfile() {
        setProfile(defaultProfile);
        saveProfileToStorage(defaultProfile);
    }

    /* reloadProfile - called after login so the newly logged-in user's
       data loads into state immediately, without needing a page refresh */
    function reloadProfile() {
        loadProfileFromStorage();
    }

    return (
        <UserProfileContext.Provider value={{ profile, updateProfile, resetProfile, reloadProfile }}>
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const ctx = useContext(UserProfileContext);
    if (!ctx) throw new Error("useUserProfile must be used inside UserProfileProvider");
    return ctx;
}

export default UserProfileContext;
