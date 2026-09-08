import Regulations from "./Regulations"
import Policies from "./Policies"
import Compliance from "./Compliance"

function Dashboard() {
    return (
        <div className="dashboard">
            <h2>Compliance Dashboard</h2>

            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <h3>Regulations</h3>
                    <p>Manage and review regulations.</p>
                </div>

                <div className="dashboard-card">
                    <h3>Policies</h3>
                    <p>Manage organizational policies.</p>
                </div>

                <div className="dashboard-card">
                    <h3>Compliance</h3>
                    <p>Track compliance requirements.</p>
                </div>

                <div className="dashboard-card">
                    <h3>Research</h3>
                    <p>Search and analyze legal information.</p>
                </div>
            </div>

            <Regulations />
            <Policies />
            <Compliance />
        </div>
    )
}

export default Dashboard