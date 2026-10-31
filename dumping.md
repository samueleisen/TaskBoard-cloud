TaskBoard: a small team task app, deployed on GCP
Live demo: (link) · Architecture diagram below · Monthly running cost: about $6

What it is: A task tracker with login, teams, and email reminders. I built it to practice running a real service, not only writing features.

Stack: Node/Postgres backend, React frontend, Cloud Run, Cloud SQL, Terraform for infrastructure, GitHub Actions for CI/CD.

Architecture: (a simple diagram: user → load balancer → Cloud Run → Cloud SQL, with Secret Manager and logging)

What happens on every push: tests run, a container builds, it deploys to staging automatically, and production needs one manual approval. A rollback takes one command.

Reliability and cost decisions:

Budget alerts at $5, $10, and $20 so a mistake can’t run quietly.
Autoscaling capped at 3 instances, so a traffic spike or a bug can’t produce a huge bill.
Log retention set to 14 days after I found logs were my biggest hidden cost.
Secrets live in Secret Manager, not in the repo.
Daily database backups, and I tested restoring one.

A mistake I made: My first version left a database instance oversized and running 24/7, which cost about $40 in a month before I noticed. I fixed it with a smaller tier and an alert, and I documented what I changed.