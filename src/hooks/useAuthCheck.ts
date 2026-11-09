import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'


import { useAuthStore } from '@/stores'
import { api, ApiResponse } from '@/lib'


export const useAuthCheck = () => {
    const { token, logout } = useAuthStore()
    const navigate = useNavigate()
    
    useEffect(() => {
        const verify_session = async () => {
            if (!token) return;

            try{
                await api.get<ApiResponse>(`/users/refresh-token`);
            } catch(error){
                console.error("Error validando la sesión:", error);
                logout();
                navigate('/');
            }
        }

        verify_session();
    }, [token, logout, navigate]);
} 