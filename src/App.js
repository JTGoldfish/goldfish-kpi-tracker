import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, ReferenceLine } from 'recharts';

// --- Firebase Configuration ---
// This will be populated by the environment.
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {};

// --- App Initialization ---
let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.error("Firebase config is not available.");
}

// --- Goal Constants ---
const WEEKLY_OUTBOUND_GOAL = 160;


// --- Helper Functions & Initial Data ---
const initialData = [
    { weekStartDate: '2025-06-09', newLeads: 70, emailsDelivered: 115, emailsOpened: 28, emailsReplied: 0, profileVisits: 55, connectionRequests: 60, likes: 12, messagesSent: 3, callsDialed: 2, callsConnected: 0, meetingsBooked: 1 },
    { weekStartDate: '2025-06-16', newLeads: 75, emailsDelivered: 120, emailsOpened: 30, emailsReplied: 1, profileVisits: 60, connectionRequests: 65, likes: 15, messagesSent: 4, callsDialed: 5, callsConnected: 1, meetingsBooked: 0 },
    { weekStartDate: '2025-06-23', newLeads: 80, emailsDelivered: 133, emailsOpened: 43, emailsReplied: 0, profileVisits: 79, connectionRequests: 70, likes: 17, messagesSent: 5, callsDialed: 3, callsConnected: 0, meetingsBooked: 0 },
    { weekStartDate: '2025-06-30', newLeads: 81, emailsDelivered: 190, emailsOpened: 38, emailsReplied: 0, profileVisits: 85, connectionRequests: 80, likes: 32, messagesSent: 11, callsDialed: 0, callsConnected: 0, meetingsBooked: 0 },
    { weekStartDate: '2025-07-07', newLeads: 106, emailsDelivered: 251, emailsOpened: 40, emailsReplied: 0, profileVisits: 107, connectionRequests: 96, likes: 61, messagesSent: 41, callsDialed: 0, callsConnected: 0, meetingsBooked: 0 },
    { weekStartDate: '2025-07-14', newLeads: 49, emailsDelivered: 201, emailsOpened: 36, emailsReplied: 0, profileVisits: 73, connectionRequests: 60, likes: 32, messagesSent: 17, callsDialed: 0, callsConnected: 0, meetingsBooked: 0 },
    { weekStartDate: '2025-07-21', newLeads: 91, emailsDelivered: 187, emailsOpened: 37, emailsReplied: 0, profileVisits: 92, connectionRequests: 80, likes: 29, messagesSent: 10, callsDialed: 0, callsConnected: 0, meetingsBooked: 0 },
    { weekStartDate: '2025-07-28', newLeads: 253, emailsDelivered: 244, emailsOpened: 44, emailsReplied: 0, profileVisits: 95, connectionRequests: 65, likes: 47, messagesSent: 10, callsDialed: 563, callsConnected: 30, meetingsBooked: 3 },
    { weekStartDate: '2025-08-04', newLeads: 298, emailsDelivered: 361, emailsOpened: 123, emailsReplied: 0, profileVisits: 205, connectionRequests: 100, likes: 47, messagesSent: 22, callsDialed: 387, callsConnected: 28, meetingsBooked: 4 },
];

const calculateTotalOutbound = (week) => {
    // Definition: sum of calls, emails, profile visits, connection requests, messages, and likes.
    return (week.emailsDelivered || 0) + (week.profileVisits || 0) + (week.connectionRequests || 0) + (week.messagesSent || 0) + (week.callsDialed || 0) + (week.likes || 0);
};

const calculateTotalLinkedInActivity = (week) => {
    return (week.profileVisits || 0) + (week.connectionRequests || 0) + (week.likes || 0) + (week.messagesSent || 0);
};

// --- Components ---

const Header = ({ setView, view }) => (
    <header className="bg-gray-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Goldfish Code Sales KPI Tracker</h1>
            <nav>
                <button
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setView('form')}
                    className={`ml-4 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'form' ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                    Add Weekly Data
                </button>
            </nav>
        </div>
    </header>
);

const KPICard = ({ title, value, subtext }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300">
        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        {subtext && <p className="text-gray-400 text-xs mt-1">{subtext}</p>}
    </div>
);

const ActivityChart = ({ title, data, lines }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {lines.map(line => (
                    <Line key={line.dataKey} type="monotone" dataKey={line.dataKey} name={line.name || line.dataKey} stroke={line.stroke} strokeWidth={2} activeDot={{ r: 8 }} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
);

const KPIProgressChart = ({ data }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-gray-700 mb-1">KPI Progress vs. Goals</h3>
        <p className="text-sm text-gray-500 mb-4">Weekly Goal: 160 Outbound Activities (32 per day)</p>
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="weeklyOutbound" name="Weekly Activities" fill="#8884d8" />
                <Line yAxisId="right" type="monotone" dataKey="cumulativeOutbound" name="Cumulative Actual" stroke="#ff7300" strokeWidth={3} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativeYearlyGoalPace" name="Cumulative Goal" stroke="#28a745" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <ReferenceLine yAxisId="left" y={WEEKLY_OUTBOUND_GOAL} label={{ value: "Weekly Goal", position: "insideTopRight", fill: "#dc3545" }} stroke="#dc3545" strokeDasharray="3 3" />
            </ComposedChart>
        </ResponsiveContainer>
    </div>
);

const RecentWeekSummary = ({ latestWeek }) => {
    if (!latestWeek) return null;

    const totalLinkedIn = calculateTotalLinkedInActivity(latestWeek);

    return (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Latest Week's Summary ({new Date(latestWeek.weekStartDate).toLocaleDateString('en-US', { timeZone: 'UTC' })})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                <div className="p-2">
                    <p className="text-sm text-gray-600">New Leads</p>
                    <p className="text-2xl font-bold text-indigo-600">{latestWeek.newLeads}</p>
                </div>
                <div className="p-2">
                    <p className="text-sm text-gray-600">Emails Delivered</p>
                    <p className="text-2xl font-bold text-indigo-600">{latestWeek.emailsDelivered}</p>
                </div>
                <div className="p-2">
                    <p className="text-sm text-gray-600">LinkedIn Activity</p>
                    <p className="text-2xl font-bold text-indigo-600">{totalLinkedIn}</p>
                </div>
                <div className="p-2">
                    <p className="text-sm text-gray-600">Calls Dialed</p>
                    <p className="text-2xl font-bold text-indigo-600">{latestWeek.callsDialed}</p>
                </div>
                 <div className="p-2">
                    <p className="text-sm text-gray-600">Calls Connected</p>
                    <p className="text-2xl font-bold text-indigo-600">{latestWeek.callsConnected}</p>
                </div>
                <div className="p-2">
                    <p className="text-sm text-gray-600">Meetings Booked</p>
                    <p className="text-2xl font-bold text-green-600">{latestWeek.meetingsBooked}</p>
                </div>
            </div>
        </div>
    );
};


const Dashboard = ({ weeklyData }) => {
    if (weeklyData.length === 0) {
        return <div className="text-center p-10"><p className="text-gray-500">Loading data or no data available. Add some weekly data to get started!</p></div>;
    }

    // --- All-Time KPI Calculations (uses full dataset) ---
    const totalMeetings = weeklyData.reduce((sum, week) => sum + week.meetingsBooked, 0);
    const totalNewLeads = weeklyData.reduce((sum, week) => sum + week.newLeads, 0);
    const totalOutbound = weeklyData.reduce((sum, week) => sum + calculateTotalOutbound(week), 0);
    const totalCallsDialed = weeklyData.reduce((sum, week) => sum + week.callsDialed, 0);
    const totalCallsConnected = weeklyData.reduce((sum, week) => sum + week.callsConnected, 0);

    const leadConversionRate = totalNewLeads > 0 ? (totalMeetings / totalNewLeads * 100).toFixed(1) + '%' : '0%';
    const callConnectionRate = totalCallsDialed > 0 ? (totalCallsConnected / totalCallsDialed * 100).toFixed(1) + '%' : '0%';
    const activitiesPerMeeting = totalMeetings > 0 ? (totalOutbound / totalMeetings).toFixed(1) : 'N/A';
    
    // --- Sort all data once ---
    const sortedFullData = [...weeklyData].sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate));

    // --- Prepare data for the main KPI chart (all historical data) ---
    let cumulativeOutbound = 0;
    const kpiChartData = sortedFullData.map((week, index) => {
        cumulativeOutbound += calculateTotalOutbound(week);
        return {
            name: new Date(week.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
            weeklyOutbound: calculateTotalOutbound(week),
            cumulativeOutbound: cumulativeOutbound,
            cumulativeYearlyGoalPace: (index + 1) * WEEKLY_OUTBOUND_GOAL,
        };
    });

    // --- Prepare data for smaller trend charts (last 8 weeks) ---
    const recent8Weeks = [...sortedFullData].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate)).slice(0, 8);
    const smallChartData = recent8Weeks.map(week => ({
        name: new Date(week.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        totalLinkedInActivity: calculateTotalLinkedInActivity(week),
        ...week
    })).sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate));

    // --- Latest Week Summary Data ---
    const latestWeek = [...weeklyData].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))[0];

    return (
        <div className="p-4 md:p-8 space-y-8">
            <RecentWeekSummary latestWeek={latestWeek} />
            
            <KPIProgressChart data={kpiChartData} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPICard title="Total Meetings Booked" value={totalMeetings} subtext="All Time" />
                <KPICard title="Lead Conversion Rate" value={leadConversionRate} subtext="Meetings / New Leads" />
                <KPICard title="Call Connection Rate" value={callConnectionRate} subtext="Connected / Dialed" />
                <KPICard title="Total New Leads" value={totalNewLeads} subtext="All Time" />
                <KPICard title="Total Outbound Activities" value={totalOutbound.toLocaleString()} subtext="All Time" />
                <KPICard title="Activities Per Meeting" value={activitiesPerMeeting} subtext="Effort to get 1 meeting" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ActivityChart 
                    title="Emails Sent"
                    data={smallChartData}
                    lines={[
                        { dataKey: 'emailsDelivered', name: 'Delivered', stroke: '#8884d8' },
                        { dataKey: 'emailsOpened', name: 'Opened', stroke: '#82ca9d' },
                    ]}
                />
                 <ActivityChart 
                    title="Calls Dialed"
                    data={smallChartData}
                    lines={[
                        { dataKey: 'callsDialed', name: 'Dialed', stroke: '#ffc658' },
                        { dataKey: 'callsConnected', name: 'Connected', stroke: '#ff7300' },
                    ]}
                />
                 <ActivityChart 
                    title="LinkedIn Activity"
                    data={smallChartData}
                    lines={[
                        { dataKey: 'totalLinkedInActivity', name: 'Total Activity', stroke: '#0088FE' },
                    ]}
                />
                 <ActivityChart 
                    title="Meetings Booked"
                    data={smallChartData}
                    lines={[
                        { dataKey: 'meetingsBooked', name: 'Booked', stroke: '#d0ed57' },
                    ]}
                />
            </div>
            
            <HistoryTable weeklyData={weeklyData} />
        </div>
    );
};

const HistoryTable = ({ weeklyData }) => {
    const sortedData = [...weeklyData].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Historical Data</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week Start</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Leads</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emails</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LinkedIn</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meetings</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedData.map((week) => (
                            <tr key={week.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(week.weekStartDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{week.newLeads}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{week.emailsDelivered} Delivered</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{calculateTotalLinkedInActivity(week)} Activities</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{week.callsDialed} Dialed</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold text-indigo-600">{week.meetingsBooked}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DataForm = ({ onAddWeek }) => {
    const [formData, setFormData] = useState({
        weekStartDate: '', newLeads: '', emailsDelivered: '', emailsOpened: '', emailsReplied: '', profileVisits: '', connectionRequests: '', likes: '', messagesSent: '', callsDialed: '', callsConnected: '', meetingsBooked: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const numericData = {};
        for (const key in formData) {
            if (key !== 'weekStartDate') {
                numericData[key] = parseFloat(formData[key]) || 0;
            } else {
                numericData[key] = formData[key];
            }
        }
        
        onAddWeek(numericData);
        setFormData({
            weekStartDate: '', newLeads: '', emailsDelivered: '', emailsOpened: '', emailsReplied: '', profileVisits: '', connectionRequests: '', likes: '', messagesSent: '', callsDialed: '', callsConnected: '', meetingsBooked: '',
        });
    };
    
    const inputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
    const labelClass = "block text-sm font-medium text-gray-700";

    return (
        <div className="p-4 md:p-8">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Add New Weekly Metrics</h2>
                    <p className="text-sm text-gray-500 mt-1">Enter your sales data for the week. All fields are required.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="weekStartDate" className={labelClass}>Week Start Date</label>
                        <input type="date" name="weekStartDate" value={formData.weekStartDate} onChange={handleChange} className={inputClass} required />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700">Leads</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            <div><label className={labelClass}>New Leads</label><input type="number" name="newLeads" value={formData.newLeads} onChange={handleChange} className={inputClass} placeholder="e.g., 80" /></div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700">Emails</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            <div><label className={labelClass}>Emails Delivered</label><input type="number" name="emailsDelivered" value={formData.emailsDelivered} onChange={handleChange} className={inputClass} placeholder="e.g., 133" /></div>
                            <div><label className={labelClass}>Emails Opened</label><input type="number" name="emailsOpened" value={formData.emailsOpened} onChange={handleChange} className={inputClass} placeholder="e.g., 43" /></div>
                            <div><label className={labelClass}>Emails Replied</label><input type="number" name="emailsReplied" value={formData.emailsReplied} onChange={handleChange} className={inputClass} placeholder="e.g., 0" /></div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700">LinkedIn</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div><label className={labelClass}>Profile Visits</label><input type="number" name="profileVisits" value={formData.profileVisits} onChange={handleChange} className={inputClass} placeholder="e.g., 79" /></div>
                            <div><label className={labelClass}>Connection Requests</label><input type="number" name="connectionRequests" value={formData.connectionRequests} onChange={handleChange} className={inputClass} placeholder="e.g., 70" /></div>
                            <div><label className={labelClass}>Likes</label><input type="number" name="likes" value={formData.likes} onChange={handleChange} className={inputClass} placeholder="e.g., 17" /></div>
                            <div><label className={labelClass}>Messages Sent</label><input type="number" name="messagesSent" value={formData.messagesSent} onChange={handleChange} className={inputClass} placeholder="e.g., 5" /></div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700">Calls & Meetings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            <div><label className={labelClass}>Calls Dialed</label><input type="number" name="callsDialed" value={formData.callsDialed} onChange={handleChange} className={inputClass} placeholder="e.g., 3" /></div>
                            <div><label className={labelClass}>Calls Connected</label><input type="number" name="callsConnected" value={formData.callsConnected} onChange={handleChange} className={inputClass} placeholder="e.g., 0" /></div>
                            <div><label className={labelClass}>Meetings Booked</label><input type="number" name="meetingsBooked" value={formData.meetingsBooked} onChange={handleChange} className={inputClass} placeholder="e.g., 0" /></div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300">
                        Add Week's Data
                    </button>
                </div>
            </form>
        </div>
    );
};


export default function App() {
    const [view, setView] = useState('dashboard');
    const [weeklyData, setWeeklyData] = useState([]);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            setIsLoading(false);
            return;
        };

        const performAuth = async () => {
            try {
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) {
                    await signInWithCustomToken(auth, token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        };

        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (user) {
                setUserId(user.uid);
            } else {
                performAuth();
            }
        });
        
        if (!auth.currentUser) {
            performAuth();
        }

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!userId || !db) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const weeklyDataCollection = collection(db, `artifacts/${appId}/users/${userId}/weeklyData`);
        
        const unsubscribeFirestore = onSnapshot(weeklyDataCollection, (snapshot) => {
            if (snapshot.empty) {
                console.log("No data found. Pre-populating with initial data...");
                const batchPromises = initialData.map(week => {
                    const docRef = doc(weeklyDataCollection, week.weekStartDate);
                    return setDoc(docRef, { ...week, createdAt: serverTimestamp() });
                });
                Promise.all(batchPromises)
                    .then(() => console.log("Initial data populated."))
                    .catch(e => console.error("Error populating data: ", e));
            } else {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setWeeklyData(data);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching weekly data:", error);
            setIsLoading(false);
        });

        return () => unsubscribeFirestore();
    }, [userId]);

    const handleAddWeek = async (newWeek) => {
        if (!userId) {
            alert("Authentication error. Cannot add data.");
            return;
        }
        if (!newWeek.weekStartDate) {
            alert("Week Start Date is required.");
            return;
        }
        
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const weeklyDataCollection = collection(db, `artifacts/${appId}/users/${userId}/weeklyData`);
            const docRef = doc(weeklyDataCollection, newWeek.weekStartDate);
            await setDoc(docRef, { ...newWeek, createdAt: serverTimestamp() });
            console.log("Document written with ID: ", newWeek.weekStartDate);
            setView('dashboard');
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to add data. Please try again.");
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <Header setView={setView} view={view} />
            <main className="container mx-auto">
                {isLoading ? (
                     <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                     </div>
                ) : (
                    view === 'dashboard' ? <Dashboard weeklyData={weeklyData} /> : <DataForm onAddWeek={handleAddWeek} />
                )}
            </main>
            <footer className="text-center p-4 text-gray-500 text-xs">
                <p>&copy; 2025 Sales KPI Tracker. Built for you.</p>
            </footer>
        </div>
    );
}
