// src/app/verify-email/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyEmail() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('กำลังยืนยันอีเมล...');

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            try {
                const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';
                const response = await fetch(`${API_URL}/api/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('✅ ยืนยันอีเมลสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว');
                } else {
                    setStatus('error');
                    setMessage('❌ ' + (data.error || 'การยืนยันล้มเหลว'));
                }
            } catch (error) {
                setStatus('error');
                setMessage('❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
        };

        verifyEmail();
    }, [searchParams]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom right, #1e293b, #581c87, #1e293b)',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '40px',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
            }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '16px'
                }}>
                    {status === 'loading' && '⏳ กำลังยืนยันอีเมล...'}
                    {status === 'success' && '✅ ยืนยันอีเมลสำเร็จ!'}
                    {status === 'error' && '❌ การยืนยันล้มเหลว'}
                </h1>

                <p style={{
                    color: '#cbd5e1',
                    marginBottom: '32px',
                    lineHeight: '1.5'
                }}>
                    {message}
                </p>

                {status === 'success' && (
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        ไปที่หน้าเข้าสู่ระบบ
                    </button>
                )}

                {status === 'error' && (
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        กลับหน้าแรก
                    </button>
                )}
            </div>
        </div>
    );
}