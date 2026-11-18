/* =========================================================
   Course content. Each topic becomes its own page at /topic/<slug>
   Served to the browser by server.js at /api/topics. Code strings are escaped when rendered.
   (Inside template literals, write \${ for a literal ${ )
   ========================================================= */
module.exports = [
  /* ------------------------------------------------------ SSH */
  {
    slug: "ssh",
    title: "SSH — Secure Shell",
    short: "SSH",
    icon: "🔐",
    level: "Beginner",
    time: "2 h",
    tagline: "The encrypted front door to every Linux server you will ever manage.",
    intro:
      "SSH (Secure Shell) is a network protocol that gives you an encrypted terminal on a remote machine. Ansible, Git, scp, rsync, VS Code Remote and most cloud tooling all ride on top of it, so it is the first skill every DevOps engineer needs.",
    why: [
      "Every server in the cloud is managed over SSH (or tools built on it).",
      "Key-based authentication is far more secure than passwords and enables automation.",
      "Tunnels let you reach private databases and dashboards without exposing them to the internet.",
    ],
    concepts: [
      { t: "Client & Server", d: "You run the <code>ssh</code> client; the remote machine runs the <code>sshd</code> daemon, listening on TCP port 22 by default." },
      { t: "Key pair", d: "A <b>private key</b> stays on your laptop (never share it). The <b>public key</b> is copied to servers you want to log in to." },
      { t: "authorized_keys", d: "<code>~/.ssh/authorized_keys</code> on the server lists the public keys allowed to log in as that user." },
      { t: "known_hosts", d: "<code>~/.ssh/known_hosts</code> on your machine remembers each server's fingerprint to protect you from man-in-the-middle attacks." },
      { t: "ssh-agent", d: "Holds your decrypted private keys in memory so you type the passphrase once per session." },
      { t: "Port forwarding", d: "Sends traffic for a local port through the encrypted connection to a port on (or behind) the server." },
    ],
    sections: [
      {
        h: "How a connection is established",
        html: `<ol class="steps-list">
          <li><b>TCP handshake</b> — the client connects to port 22.</li>
          <li><b>Version & algorithm negotiation</b> — both sides agree on ciphers and key-exchange methods.</li>
          <li><b>Key exchange</b> (e.g. Curve25519) — a shared session key is created without ever being sent over the wire.</li>
          <li><b>Host verification</b> — your client checks the server's host key against <code>known_hosts</code>.</li>
          <li><b>User authentication</b> — the server challenges you to prove you own a private key matching an entry in <code>authorized_keys</code>.</li>
          <li><b>Session</b> — everything from now on (shell, files, tunnels) is encrypted.</li>
        </ol>`,
      },
      {
        h: "Choosing a key type",
        html: `<table class="tbl"><thead><tr><th>Type</th><th>Recommendation</th><th>Notes</th></tr></thead><tbody>
          <tr><td><code>ed25519</code></td><td class="good">Use this</td><td>Small, fast, modern and secure. Default choice today.</td></tr>
          <tr><td><code>rsa</code> 4096</td><td class="ok">OK for legacy</td><td>Use only if an old system doesn't support ed25519.</td></tr>
          <tr><td><code>dsa</code></td><td class="bad">Never</td><td>Deprecated and disabled in modern OpenSSH.</td></tr>
        </tbody></table>`,
      },
      {
        h: "The ~/.ssh/config file",
        html: `<p>Instead of typing long commands, give each server an alias. Then <code>ssh web</code> is all you need — and Ansible, scp and Git use the same settings.</p>`,
        code: { lang: "~/.ssh/config", src: `Host web
    HostName 203.0.113.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519

# Reach a private server through a public "bastion" host
Host db
    HostName 10.0.2.15
    User ubuntu
    ProxyJump web` },
      },
      {
        h: "Tunnels: local, remote and dynamic",
        html: `<table class="tbl"><thead><tr><th>Flag</th><th>Direction</th><th>Typical use</th></tr></thead><tbody>
          <tr><td><code>-L</code></td><td>Local → remote</td><td>Open a remote database or Grafana on <code>localhost</code>.</td></tr>
          <tr><td><code>-R</code></td><td>Remote → local</td><td>Show a server something running on your laptop.</td></tr>
          <tr><td><code>-D</code></td><td>Dynamic (SOCKS)</td><td>Browse through the server like a lightweight VPN.</td></tr>
        </tbody></table>`,
        code: { lang: "bash", src: `# PostgreSQL on the server becomes localhost:5432 on your laptop
ssh -L 5432:localhost:5432 web

# Grafana running on a private host behind the bastion
ssh -L 3000:10.0.2.20:3000 web` },
      },
    ],
    lab: {
      title: "Passwordless & hardened login to your VM",
      steps: [
        { t: "Generate an ed25519 key pair (press Enter to accept the path; set a passphrase).", code: `ssh-keygen -t ed25519 -C "student@laptop"` },
        { t: "Copy the public key to the server. You'll type the password one last time.", code: `ssh-copy-id ubuntu@192.168.56.10` },
        { t: "Log in — no password needed now.", code: `ssh ubuntu@192.168.56.10` },
        { t: "On the server, disable password and root login.", code: `sudo nano /etc/ssh/sshd_config
# set these lines:
PasswordAuthentication no
PermitRootLogin no` },
        { t: "Validate the config and restart the service. Keep your current session open until you've tested a new one!", code: `sudo sshd -t && sudo systemctl restart ssh` },
      ],
    },
    cheats: [
      ["ssh user@host", "Connect to a server"],
      ["ssh -p 2222 user@host", "Connect on a non-default port"],
      ["ssh-keygen -t ed25519", "Create a new key pair"],
      ["ssh-copy-id user@host", "Install your public key on a server"],
      ["scp file.txt web:/tmp/", "Copy a file to a server"],
      ["rsync -avz ./site/ web:/var/www/", "Sync a folder efficiently"],
      ["ssh -L 8080:localhost:80 web", "Local port forward"],
      ["ssh-keygen -R host", "Remove an old host key from known_hosts"],
    ],
    best: [
      "Always protect private keys with a passphrase and <code>chmod 600</code>.",
      "Disable password authentication and direct root login on servers.",
      "Use a bastion (jump) host instead of exposing every server's port 22.",
      "Use one key per device so you can revoke a lost laptop without affecting others.",
      "Never commit private keys to Git — scan repos with tools like gitleaks.",
    ],
    quiz: [
      { q: "Which file on the server lists the public keys allowed to log in?", o: ["~/.ssh/known_hosts", "~/.ssh/authorized_keys", "/etc/ssh/ssh_config", "~/.ssh/id_ed25519"], a: 1, e: "authorized_keys holds allowed public keys. known_hosts lives on the client and stores server fingerprints." },
      { q: "Which key type should you generate by default today?", o: ["DSA", "RSA 1024", "ed25519", "ECDSA 256 with no passphrase"], a: 2, e: "ed25519 is modern, small, fast and secure." },
      { q: "You want to open a remote PostgreSQL on localhost:5432. Which flag?", o: ["-R", "-D", "-L", "-X"], a: 2, e: "-L creates a local forward: a local port is tunnelled to a remote destination." },
    ],
    links: [
      ["OpenSSH manual", "https://www.openssh.com/manual.html"],
      ["ssh_config(5) reference", "https://man.openbsd.org/ssh_config"],
    ],
  },

  /* ------------------------------------------------------ VIRTUALIZATION */
  {
    slug: "virtualization",
    title: "Virtualization & VirtualBox",
    short: "Virtualization",
    icon: "🖥️",
    level: "Beginner",
    time: "3 h",
    tagline: "Build a complete multi-server lab on your own laptop — and break it safely.",
    intro:
      "Virtualization lets one physical computer run several isolated operating systems at once. It's the foundation of every cloud provider, and with VirtualBox you can build a realistic lab of Linux servers for free to practise SSH, Ansible, Docker and Kubernetes.",
    why: [
      "Cloud instances (EC2, Azure VMs, GCE) are virtual machines running on hypervisors.",
      "A local lab lets you experiment without paying for cloud resources.",
      "Snapshots give you an \"undo button\" for an entire operating system.",
    ],
    concepts: [
      { t: "Hypervisor", d: "Software that creates and runs VMs, sharing CPU, RAM, disk and network between them." },
      { t: "Host vs Guest", d: "The <b>host</b> is your physical machine. Each <b>guest</b> is an OS running inside a VM." },
      { t: "Type 1 hypervisor", d: "Runs directly on hardware: VMware ESXi, Proxmox, Hyper-V, KVM. Used in data centres." },
      { t: "Type 2 hypervisor", d: "Runs as an app on a normal OS: VirtualBox, VMware Workstation. Perfect for labs." },
      { t: "Virtual disk", d: "A file (VDI, VMDK, VHD) acting as the VM's hard drive. <i>Dynamic</i> disks grow as needed; <i>fixed</i> are pre-allocated and slightly faster." },
      { t: "Snapshot", d: "A saved point-in-time state of a VM you can roll back to in seconds." },
    ],
    sections: [
      {
        h: "Virtual machines vs containers",
        html: `<table class="tbl"><thead><tr><th></th><th>Virtual machine</th><th>Container</th></tr></thead><tbody>
          <tr><td>Isolation</td><td>Full OS with its own kernel</td><td>Shares the host kernel</td></tr>
          <tr><td>Size</td><td>Gigabytes</td><td>Megabytes</td></tr>
          <tr><td>Boot time</td><td>Tens of seconds</td><td>Milliseconds</td></tr>
          <tr><td>Use case</td><td>Different OSes, strong isolation</td><td>Packaging & shipping apps</td></tr>
        </tbody></table>
        <p>They aren't rivals — in the cloud, containers usually run <i>inside</i> VMs.</p>`,
      },
      {
        h: "VirtualBox network modes",
        html: `<table class="tbl"><thead><tr><th>Mode</th><th>VM → Internet</th><th>Host → VM</th><th>VM ↔ VM</th><th>Use it for</th></tr></thead><tbody>
          <tr><td><b>NAT</b></td><td>✅</td><td>Port-forward only</td><td>❌</td><td>Default, simple internet access</td></tr>
          <tr><td><b>NAT Network</b></td><td>✅</td><td>Port-forward only</td><td>✅</td><td>Several VMs that need internet</td></tr>
          <tr><td><b>Bridged</b></td><td>✅</td><td>✅</td><td>✅</td><td>VM appears as a real device on your LAN</td></tr>
          <tr><td><b>Host-only</b></td><td>❌</td><td>✅</td><td>✅</td><td>Private lab network (192.168.56.0/24)</td></tr>
          <tr><td><b>Internal</b></td><td>❌</td><td>❌</td><td>✅</td><td>Isolated VM-only networks</td></tr>
        </tbody></table>
        <p class="tip">💡 Classic lab setup: <b>Adapter 1 = NAT</b> (internet) + <b>Adapter 2 = Host-only</b> (fixed IP you can SSH to).</p>`,
      },
      {
        h: "Automating VMs with Vagrant",
        html: `<p>Clicking through the VirtualBox GUI is fine once. <b>Vagrant</b> describes VMs in a file so you can recreate a whole lab with one command — your first taste of Infrastructure as Code.</p>`,
        code: { lang: "Vagrantfile", src: `Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  ["web", "db"].each_with_index do |name, i|
    config.vm.define name do |node|
      node.vm.hostname = name
      node.vm.network "private_network", ip: "192.168.56.#{10 + i}"
      node.vm.provider "virtualbox" do |vb|
        vb.memory = 2048
        vb.cpus = 2
      end
    end
  end
end` },
      },
    ],
    lab: {
      title: "Create an Ubuntu Server VM and SSH into it",
      steps: [
        { t: "Install VirtualBox from virtualbox.org and download the Ubuntu Server 24.04 LTS ISO. Make sure VT-x/AMD-V is enabled in your BIOS." },
        { t: "Create the VM from the command line (or use the GUI wizard: 2 CPU, 2 GB RAM, 20 GB dynamic disk).", code: `VBoxManage createvm --name lab --ostype Ubuntu_64 --register
VBoxManage modifyvm lab --cpus 2 --memory 2048 --nic1 nat
VBoxManage createmedium disk --filename lab.vdi --size 20480
VBoxManage storagectl lab --name SATA --add sata
VBoxManage storageattach lab --storagectl SATA --port 0 --type hdd --medium lab.vdi` },
        { t: "Attach the ISO, boot, and install Ubuntu. Tick “Install OpenSSH server” during setup." },
        { t: "Forward host port 2222 to the VM's port 22, then SSH in from your laptop.", code: `VBoxManage modifyvm lab --natpf1 "ssh,tcp,,2222,,22"
ssh -p 2222 ubuntu@127.0.0.1` },
        { t: "Take a snapshot before experimenting.", code: `VBoxManage snapshot lab take clean-install` },
      ],
    },
    cheats: [
      ["VBoxManage list vms", "List all VMs"],
      ["VBoxManage startvm lab --type headless", "Start a VM without a window"],
      ["VBoxManage controlvm lab poweroff", "Force power off"],
      ["VBoxManage snapshot lab restore NAME", "Roll back to a snapshot"],
      ["vagrant up", "Create & start every VM in the Vagrantfile"],
      ["vagrant ssh web", "SSH into a Vagrant VM"],
      ["vagrant destroy -f", "Delete the lab completely"],
    ],
    best: [
      "Give servers static IPs on a host-only network so your Ansible inventory never changes.",
      "Use headless mode for servers — you'll manage them over SSH anyway.",
      "Snapshot before every risky change; delete old snapshots to save disk space.",
      "Keep lab VMs small (1–2 GB RAM) so you can run 3–4 at once.",
    ],
    quiz: [
      { q: "VirtualBox is which type of hypervisor?", o: ["Type 1", "Type 2", "Container runtime", "Firmware"], a: 1, e: "VirtualBox runs as an application on top of a host OS — that's Type 2." },
      { q: "Which network mode gives host ↔ VM access but no internet?", o: ["NAT", "Bridged", "Host-only", "NAT Network"], a: 2, e: "Host-only creates a private network between host and VMs." },
      { q: "What's the main difference between a VM and a container?", o: ["Containers are always slower", "VMs share the host kernel", "Containers share the host kernel", "There is no difference"], a: 2, e: "Containers share the host's kernel; VMs run their own full OS." },
    ],
    links: [
      ["VirtualBox user manual", "https://www.virtualbox.org/manual/"],
      ["Vagrant documentation", "https://developer.hashicorp.com/vagrant/docs"],
    ],
  },

  /* ------------------------------------------------------ ANSIBLE */
  {
    slug: "ansible",
    title: "Ansible — Configuration Management",
    short: "Ansible",
    icon: "⚙️",
    level: "Intermediate",
    time: "5 h",
    tagline: "Describe the desired state of 1 or 1,000 servers in YAML — Ansible makes it so.",
    intro:
      "Ansible is an agentless automation tool. It connects to servers over SSH, runs small programs called modules, and brings each machine to the state you described in a playbook. Run it again and nothing changes unless something drifted — that's idempotency.",
    why: [
      "Manual server setup is slow, error-prone and impossible to repeat exactly.",
      "No agent to install — if you can SSH to it, you can automate it.",
      "Playbooks are version-controlled documentation of how your servers are built.",
    ],
    concepts: [
      { t: "Control node", d: "The machine where Ansible is installed and from which you run playbooks (your laptop or a CI runner)." },
      { t: "Inventory", d: "A list of managed hosts, organised into groups like <code>[web]</code> and <code>[db]</code>." },
      { t: "Module", d: "A unit of work: <code>apt</code>, <code>copy</code>, <code>service</code>, <code>user</code>, <code>template</code>… there are thousands." },
      { t: "Task & Playbook", d: "A <b>task</b> calls one module. A <b>playbook</b> is a YAML file of plays mapping host groups to tasks." },
      { t: "Idempotency", d: "Running the same playbook twice gives the same result. Tasks report <code>ok</code> when nothing needed to change." },
      { t: "Handler", d: "A task that runs only when notified by a change — e.g. restart nginx only if its config changed." },
    ],
    sections: [
      {
        h: "Inventory",
        html: `<p>Groups let you target sets of servers. Variables can be set per host or per group.</p>`,
        code: { lang: "inventory.ini", src: `[web]
web1 ansible_host=192.168.56.10
web2 ansible_host=192.168.56.11

[db]
db1 ansible_host=192.168.56.20

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/id_ed25519` },
      },
      {
        h: "Ad-hoc commands",
        html: `<p>Quick one-off actions without writing a playbook:</p>`,
        code: { lang: "bash", src: `ansible all -i inventory.ini -m ping
ansible web -i inventory.ini -m apt -a "name=htop state=present" --become
ansible all -i inventory.ini -a "uptime"` },
      },
      {
        h: "Variables, templates & handlers",
        html: `<p>Templates use <b>Jinja2</b> to fill in values per host. The handler only restarts nginx when the template actually changed.</p>`,
        code: { lang: "playbook.yml", src: `- name: Configure web servers
  hosts: web
  become: true
  vars:
    site_title: "DevOps Course"
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: true

    - name: Deploy homepage from template
      template:
        src: index.html.j2
        dest: /var/www/html/index.html
      notify: Restart nginx

  handlers:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted` },
      },
      {
        h: "Roles & Vault",
        html: `<p><b>Roles</b> package tasks, templates, files and defaults into a reusable folder structure (create one with <code>ansible-galaxy init nginx</code>). <b>Ansible Vault</b> encrypts secrets like passwords so they can live safely in Git.</p>`,
        code: { lang: "structure", src: `roles/nginx/
├── defaults/main.yml   # default variables
├── handlers/main.yml
├── tasks/main.yml
├── templates/
└── files/

# encrypt a secrets file
ansible-vault encrypt group_vars/db/secrets.yml
ansible-playbook site.yml --ask-vault-pass` },
      },
    ],
    lab: {
      title: "Automate an Nginx web server",
      steps: [
        { t: "Install Ansible on your control node.", code: `sudo apt update && sudo apt install -y ansible
ansible --version` },
        { t: "Create <code>inventory.ini</code> with your VM(s) (see above) and test connectivity.", code: `ansible all -i inventory.ini -m ping` },
        { t: "Create a template <code>index.html.j2</code>.", code: `<h1>{{ site_title }}</h1>
<p>Served by {{ inventory_hostname }} ({{ ansible_default_ipv4.address }})</p>` },
        { t: "Run the playbook from the section above.", code: `ansible-playbook -i inventory.ini playbook.yml` },
        { t: "Run it again — every task should say <code>ok</code> and <code>changed=0</code>. That's idempotency! Then open http://192.168.56.10 in your browser." },
      ],
    },
    cheats: [
      ["ansible all -m ping", "Test connectivity to all hosts"],
      ["ansible-playbook site.yml --check", "Dry run — show what would change"],
      ["ansible-playbook site.yml --diff", "Show file differences"],
      ["ansible-playbook site.yml -l web1", "Limit to specific hosts"],
      ["ansible-inventory --graph", "Visualise inventory groups"],
      ["ansible-doc apt", "Read a module's documentation"],
      ["ansible-galaxy init myrole", "Scaffold a new role"],
    ],
    best: [
      "Always use modules instead of <code>shell</code>/<code>command</code> when possible — they're idempotent.",
      "Name every task clearly; the output becomes readable documentation.",
      "Run with <code>--check --diff</code> before applying to production.",
      "Keep secrets in Ansible Vault, never in plain text.",
      "Split large playbooks into roles as soon as they grow past ~50 lines.",
    ],
    quiz: [
      { q: "What does Ansible need on the managed servers?", o: ["The Ansible agent", "SSH access and Python", "Docker", "A Kubernetes cluster"], a: 1, e: "Ansible is agentless: it connects over SSH and uses the server's Python." },
      { q: "A task reports \"ok\" instead of \"changed\". What does that mean?", o: ["It failed silently", "The system was already in the desired state", "It was skipped", "The host is unreachable"], a: 1, e: "\"ok\" means nothing needed to change — idempotency in action." },
      { q: "When does a handler run?", o: ["At the start of every play", "Only when notified by a task that changed", "After every task", "Only in check mode"], a: 1, e: "Handlers run at the end of a play, and only if a task that notified them reported a change." },
    ],
    links: [
      ["Ansible documentation", "https://docs.ansible.com/"],
      ["Ansible module index", "https://docs.ansible.com/ansible/latest/collections/index_module.html"],
    ],
  },

  /* ------------------------------------------------------ DOCKER */
  {
    slug: "docker",
    title: "Installing & Using Docker",
    short: "Docker",
    icon: "🐳",
    level: "Beginner",
    time: "5 h",
    tagline: "Package your app and everything it needs into one image that runs the same everywhere.",
    intro:
      "Docker packages an application together with its libraries and runtime into an image. That image runs as a lightweight, isolated container on any machine with Docker — your laptop, a CI runner or a Kubernetes cluster. “It works on my machine” stops being a problem.",
    why: [
      "Identical environments from development through production.",
      "Containers start in milliseconds and use far less memory than VMs.",
      "Images are the unit of deployment for CI/CD pipelines and Kubernetes.",
    ],
    concepts: [
      { t: "Image", d: "A read-only template built in layers from a Dockerfile, e.g. <code>nginx:1.27</code>." },
      { t: "Container", d: "A running instance of an image, with its own process space, filesystem and network." },
      { t: "Dockerfile", d: "A recipe of instructions (<code>FROM</code>, <code>COPY</code>, <code>RUN</code>, <code>CMD</code>) used to build an image." },
      { t: "Registry", d: "Stores and distributes images: Docker Hub, GitHub Container Registry, AWS ECR." },
      { t: "Volume", d: "Persistent storage that survives container restarts and removals — essential for databases." },
      { t: "Network", d: "Containers on the same user-defined network can reach each other by name." },
    ],
    sections: [
      {
        h: "How Docker works under the hood",
        html: `<div class="flow-row"><span>docker CLI</span><i>→</i><span>dockerd (API)</span><i>→</i><span>containerd</span><i>→</i><span>runc</span><i>→</i><span>Linux kernel</span></div>
        <p>The CLI talks to the Docker daemon, which delegates to <b>containerd</b> and <b>runc</b>. Isolation comes from Linux kernel features: <b>namespaces</b> (what a process can see) and <b>cgroups</b> (how much CPU/RAM it can use).</p>`,
      },
      {
        h: "Install Docker Engine on Ubuntu (official repository)",
        html: `<p>The distro's <code>docker.io</code> package is often outdated. Use Docker's own apt repository:</p>`,
        code: { lang: "bash", src: `# 1. Add Docker's GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 2. Add the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \\
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \\
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Engine, CLI, Buildx and Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Run docker without sudo (log out and back in afterwards)
sudo usermod -aG docker $USER
docker run --rm hello-world` },
      },
      {
        h: "Writing a good Dockerfile (multi-stage build)",
        html: `<p>Multi-stage builds compile in one image and copy only the result into a small runtime image — smaller, faster and more secure.</p>`,
        code: { lang: "Dockerfile", src: `# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q --spider http://localhost/ || exit 1` },
      },
      {
        h: "Multi-container apps with Docker Compose",
        code: { lang: "compose.yaml", src: `services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:` },
      },
    ],
    lab: {
      title: "Containerise and run a web app",
      steps: [
        { t: "Install Docker using the official repository commands above and verify.", code: `docker version
docker compose version` },
        { t: "Run an nginx container and open http://localhost:8080.", code: `docker run -d --name web -p 8080:80 nginx:1.27` },
        { t: "Explore it: logs, a shell inside, and resource usage.", code: `docker logs web
docker exec -it web sh
docker stats --no-stream` },
        { t: "Create a folder with an <code>index.html</code> and this Dockerfile, then build your own image.", code: `FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html` },
        { t: "Build, run and clean up.", code: `docker build -t my-site:1.0 .
docker run -d -p 8081:80 my-site:1.0
docker rm -f web` },
      ],
    },
    cheats: [
      ["docker ps -a", "List all containers"],
      ["docker images", "List local images"],
      ["docker build -t app:1.0 .", "Build an image from a Dockerfile"],
      ["docker run -d -p 8080:80 app:1.0", "Run in background, map a port"],
      ["docker exec -it NAME sh", "Open a shell in a running container"],
      ["docker logs -f NAME", "Follow container logs"],
      ["docker compose up -d", "Start all services in compose.yaml"],
      ["docker system prune", "Remove unused data"],
    ],
    best: [
      "Pin image versions (<code>nginx:1.27</code>), never rely on <code>latest</code> in production.",
      "Use small base images (alpine, distroless) and multi-stage builds.",
      "Add a <code>.dockerignore</code> to keep <code>node_modules</code>, <code>.git</code> and secrets out of images.",
      "Run as a non-root user with the <code>USER</code> instruction.",
      "One process per container; scale by running more containers.",
    ],
    quiz: [
      { q: "What is the difference between an image and a container?", o: ["They're the same thing", "An image is a running container", "A container is a running instance of an image", "Images only exist on Docker Hub"], a: 2, e: "The image is the template; a container is a running instance of it." },
      { q: "Which Linux features provide container isolation?", o: ["Namespaces and cgroups", "SSH and TLS", "Systemd and cron", "iptables only"], a: 0, e: "Namespaces isolate what a process sees; cgroups limit what it can use." },
      { q: "Why use a multi-stage build?", o: ["To run several apps in one container", "To produce a smaller final image without build tools", "To speed up docker run", "It's required by Compose"], a: 1, e: "Build tools stay in the first stage; only the output is copied into the slim final image." },
    ],
    links: [
      ["Install Docker Engine on Ubuntu", "https://docs.docker.com/engine/install/ubuntu/"],
      ["Dockerfile reference", "https://docs.docker.com/reference/dockerfile/"],
      ["Compose file reference", "https://docs.docker.com/reference/compose-file/"],
    ],
  },

  /* ------------------------------------------------------ CI/CD */
  {
    slug: "cicd",
    title: "CI/CD Pipelines",
    short: "CI/CD",
    icon: "🔁",
    level: "Intermediate",
    time: "4 h",
    tagline: "Every git push automatically built, tested, scanned and shipped.",
    intro:
      "Continuous Integration (CI) builds and tests every change as soon as it's pushed. Continuous Delivery/Deployment (CD) automatically releases tested changes to staging or production. Together they make releases small, frequent, boring and safe.",
    why: [
      "Bugs are caught minutes after they're written, not weeks later.",
      "Releases become a button click (or fully automatic) instead of a stressful event.",
      "The pipeline is the single, repeatable path to production — no “I deployed from my laptop”.",
    ],
    concepts: [
      { t: "Continuous Integration", d: "Merge small changes often; each push triggers an automated build and test run." },
      { t: "Continuous Delivery", d: "Every passing build is <i>ready</i> to release; a human approves the production deploy." },
      { t: "Continuous Deployment", d: "Every passing build goes to production automatically, with no manual step." },
      { t: "Pipeline / Workflow", d: "The automated sequence of stages, defined as code in your repository." },
      { t: "Runner / Agent", d: "The machine that executes pipeline jobs — hosted by the CI service or self-hosted." },
      { t: "Artifact", d: "A build output passed between jobs or stored: a binary, a test report, a Docker image." },
    ],
    sections: [
      {
        h: "Anatomy of a pipeline",
        html: `<div class="pipeline"><span>Commit</span><span>Build</span><span>Unit tests</span><span>Lint & scan</span><span>Build image</span><span>Push to registry</span><span>Deploy staging</span><span>Deploy prod</span></div>
        <p>Fast checks run first so developers get feedback quickly. Expensive steps (integration tests, deploys) run later and only on the main branch.</p>`,
      },
      {
        h: "GitHub Actions: build & push a Docker image",
        html: `<p>Workflows live in <code>.github/workflows/</code>. This one tests every push and, on <code>main</code>, publishes an image to GitHub Container Registry.</p>`,
        code: { lang: ".github/workflows/ci.yml", src: `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test

  docker:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/\${{ github.repository }}:\${{ github.sha }}` },
      },
      {
        h: "The same idea in GitLab CI and Jenkins",
        code: { lang: ".gitlab-ci.yml", src: `stages: [test, build]

test:
  stage: test
  image: node:22
  script:
    - npm ci
    - npm test

build:
  stage: build
  image: docker:27
  services: [docker:27-dind]
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only: [main]` },
      },
      {
        h: "Deployment strategies",
        html: `<table class="tbl"><thead><tr><th>Strategy</th><th>How it works</th><th>Pros / cons</th></tr></thead><tbody>
          <tr><td><b>Recreate</b></td><td>Stop old version, start new</td><td>Simple, but causes downtime</td></tr>
          <tr><td><b>Rolling</b></td><td>Replace instances a few at a time</td><td>No downtime; default in Kubernetes</td></tr>
          <tr><td><b>Blue / Green</b></td><td>Run new version beside old, switch traffic at once</td><td>Instant rollback; needs double resources</td></tr>
          <tr><td><b>Canary</b></td><td>Send a small % of traffic to the new version first</td><td>Lowest risk; needs good monitoring</td></tr>
        </tbody></table>`,
      },
    ],
    lab: {
      title: "Your first GitHub Actions pipeline",
      steps: [
        { t: "Create a new GitHub repository with a simple app (or this website!)." },
        { t: "Add a workflow that runs on every push.", code: `mkdir -p .github/workflows
cat > .github/workflows/hello.yml <<'EOF'
name: Hello CI
on: [push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Building commit $GITHUB_SHA"
      - run: ls -la
EOF` },
        { t: "Commit and push, then open the <b>Actions</b> tab and watch the run live.", code: `git add . && git commit -m "Add CI" && git push` },
        { t: "Break something on purpose (e.g. <code>run: exit 1</code>) and see the red ❌ — then fix it." },
        { t: "Bonus: add a Dockerfile and the <code>docker</code> job from the example above to publish an image." },
      ],
    },
    cheats: [
      ["on: push / pull_request", "Events that trigger a workflow"],
      ["runs-on: ubuntu-latest", "Choose the runner OS"],
      ["needs: test", "Job dependency (run after test)"],
      ["if: github.ref == 'refs/heads/main'", "Run only on main"],
      ["secrets.NAME", "Read an encrypted secret"],
      ["strategy.matrix", "Run a job across many versions/OSes"],
      ["actions/cache", "Cache dependencies between runs"],
    ],
    best: [
      "Keep the pipeline fast (under ~10 minutes) — slow pipelines get ignored.",
      "Never hard-code credentials; use the CI system's encrypted secrets or OIDC.",
      "Tag images with the commit SHA so every deployment is traceable.",
      "Build once, promote the same artifact through staging and production.",
      "Protect the main branch: require passing checks before merging.",
    ],
    quiz: [
      { q: "Continuous Delivery vs Continuous Deployment — what's the difference?", o: ["They're identical", "Delivery needs a manual approval for prod; Deployment is fully automatic", "Deployment only runs tests", "Delivery doesn't use pipelines"], a: 1, e: "Delivery keeps every build releasable with a human gate; Deployment removes the gate." },
      { q: "Which strategy sends a small percentage of users to the new version first?", o: ["Recreate", "Blue/Green", "Canary", "Rolling"], a: 2, e: "Canary releases expose a small slice of traffic before rolling out fully." },
      { q: "Where should a database password used by the pipeline be stored?", o: ["In the workflow YAML", "In the README", "In the CI system's encrypted secrets", "In a commit message"], a: 2, e: "Use encrypted secrets (or OIDC) — never plain text in the repo." },
    ],
    links: [
      ["GitHub Actions docs", "https://docs.github.com/actions"],
      ["GitLab CI/CD docs", "https://docs.gitlab.com/ee/ci/"],
    ],
  },

  /* ------------------------------------------------------ AWS */
  {
    slug: "aws",
    title: "AWS — Amazon Web Services",
    short: "AWS",
    icon: "☁️",
    level: "Intermediate",
    time: "6 h",
    tagline: "Rent servers, storage and networks by the second from the world's largest cloud.",
    intro:
      "AWS offers 200+ services, but a DevOps engineer uses a core set every day: IAM for access, VPC for networking, EC2 for servers, S3 for storage, RDS for databases and EKS/ECR for containers. Learn these well and the rest are variations on a theme.",
    why: [
      "AWS is the most widely used cloud provider — it appears in most DevOps job descriptions.",
      "Infrastructure is created by API calls, which makes it perfect for automation with Terraform.",
      "Pay-as-you-go pricing and the Free Tier let you practise for little or no cost.",
    ],
    concepts: [
      { t: "Region & AZ", d: "A <b>region</b> (e.g. <code>eu-central-1</code>) is a geographic area with several isolated data centres called <b>Availability Zones</b>." },
      { t: "IAM", d: "Identity & Access Management: users, groups, <b>roles</b> and JSON <b>policies</b> that control who can do what." },
      { t: "EC2", d: "Elastic Compute Cloud — virtual servers (instances) in many sizes, launched from AMIs." },
      { t: "VPC", d: "Your private, isolated network in AWS, split into public and private subnets." },
      { t: "S3", d: "Simple Storage Service — virtually unlimited object storage in “buckets”; also hosts static websites." },
      { t: "Shared responsibility", d: "AWS secures the cloud (hardware, data centres); <i>you</i> secure what you put in it (OS, data, access)." },
    ],
    sections: [
      {
        h: "IAM: least privilege",
        html: `<p>Never use the root account for daily work. Create IAM users (or better, SSO), put them in groups, and attach policies that allow only what's needed. Applications on EC2 get permissions through <b>IAM roles</b>, not stored access keys.</p>`,
        code: { lang: "policy.json", src: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-devops-course-bucket/*"
    }
  ]
}` },
      },
      {
        h: "Networking: VPC building blocks",
        html: `<div class="flow-row"><span>Internet</span><i>→</i><span>Internet Gateway</span><i>→</i><span>Public subnet (ALB, bastion)</span><i>→</i><span>Private subnet (app, DB)</span><i>→</i><span>NAT Gateway → out</span></div>
        <table class="tbl"><thead><tr><th></th><th>Security Group</th><th>Network ACL</th></tr></thead><tbody>
          <tr><td>Applies to</td><td>Instance / ENI</td><td>Whole subnet</td></tr>
          <tr><td>State</td><td>Stateful (return traffic auto-allowed)</td><td>Stateless (allow both directions)</td></tr>
          <tr><td>Rules</td><td>Allow only</td><td>Allow and deny</td></tr>
        </tbody></table>`,
      },
      {
        h: "Core services map",
        html: `<div class="svc-grid">
          <div><b>Compute</b><span>EC2, Auto Scaling, Lambda</span></div>
          <div><b>Containers</b><span>ECR, ECS, EKS, Fargate</span></div>
          <div><b>Storage</b><span>S3, EBS, EFS</span></div>
          <div><b>Database</b><span>RDS, Aurora, DynamoDB</span></div>
          <div><b>Networking</b><span>VPC, ELB, Route 53, CloudFront</span></div>
          <div><b>Operations</b><span>CloudWatch, CloudTrail, Systems Manager</span></div>
        </div>`,
      },
      {
        h: "Keeping costs under control",
        html: `<ul class="bullets">
          <li>Create an <b>AWS Budget</b> with an email alert (e.g. $5) on day one.</li>
          <li>Use Free Tier eligible sizes such as <code>t3.micro</code> / <code>t4g.micro</code> for labs.</li>
          <li><b>Stop or terminate</b> instances when you finish; delete unattached EBS volumes and Elastic IPs.</li>
          <li>NAT Gateways and load balancers bill per hour even when idle — remove them after labs.</li>
        </ul>`,
      },
    ],
    lab: {
      title: "Launch an EC2 web server with the AWS CLI",
      steps: [
        { t: "Install the AWS CLI v2 and configure credentials for an IAM user (not root).", code: `aws configure          # access key, secret, region e.g. eu-central-1
aws sts get-caller-identity` },
        { t: "Create a key pair and a security group allowing SSH and HTTP.", code: `aws ec2 create-key-pair --key-name course --query KeyMaterial --output text > course.pem
chmod 400 course.pem
aws ec2 create-security-group --group-name web-sg --description "web"
aws ec2 authorize-security-group-ingress --group-name web-sg --protocol tcp --port 22 --cidr YOUR_IP/32
aws ec2 authorize-security-group-ingress --group-name web-sg --protocol tcp --port 80 --cidr 0.0.0.0/0` },
        { t: "Launch an Ubuntu instance (find a current Ubuntu AMI ID for your region in the console).", code: `aws ec2 run-instances --image-id ami-XXXXXXXX --instance-type t3.micro \\
  --key-name course --security-groups web-sg \\
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=course-web}]'` },
        { t: "Get its public IP, SSH in and install nginx.", code: `aws ec2 describe-instances --filters Name=tag:Name,Values=course-web \\
  --query "Reservations[].Instances[].PublicIpAddress" --output text
ssh -i course.pem ubuntu@PUBLIC_IP "sudo apt update && sudo apt install -y nginx"` },
        { t: "Visit http://PUBLIC_IP — then <b>terminate</b> the instance so it stops billing.", code: `aws ec2 terminate-instances --instance-ids i-XXXXXXXX` },
      ],
    },
    cheats: [
      ["aws sts get-caller-identity", "Who am I logged in as?"],
      ["aws s3 ls", "List buckets"],
      ["aws s3 cp file.txt s3://bucket/", "Upload a file"],
      ["aws s3 sync ./site s3://bucket", "Sync a folder to S3"],
      ["aws ec2 describe-instances", "List EC2 instances"],
      ["aws ec2 stop-instances --instance-ids ID", "Stop an instance"],
      ["aws eks update-kubeconfig --name CLUSTER", "Connect kubectl to EKS"],
    ],
    best: [
      "Enable MFA on the root account, then lock it away.",
      "Grant least privilege; prefer IAM roles over long-lived access keys.",
      "Put databases and app servers in private subnets.",
      "Spread production workloads across at least two Availability Zones.",
      "Tag every resource (Owner, Project, Environment) for cost tracking.",
    ],
    quiz: [
      { q: "How should an EC2 instance get permission to read from S3?", o: ["Store access keys in a file on the instance", "Attach an IAM role to the instance", "Use the root account keys", "Make the bucket public"], a: 1, e: "IAM roles provide temporary, automatically rotated credentials." },
      { q: "Security Groups are…", o: ["Stateless, subnet-level", "Stateful, instance-level", "Only for S3", "Deny-only rules"], a: 1, e: "Security groups are stateful and attach to instances/network interfaces." },
      { q: "What is an Availability Zone?", o: ["A pricing tier", "One or more isolated data centres within a region", "A type of EC2 instance", "A DNS record"], a: 1, e: "Regions contain multiple AZs, each with independent power and networking." },
    ],
    links: [
      ["AWS documentation", "https://docs.aws.amazon.com/"],
      ["AWS Free Tier", "https://aws.amazon.com/free/"],
      ["AWS CLI reference", "https://docs.aws.amazon.com/cli/"],
    ],
  },

  /* ------------------------------------------------------ TERRAFORM */
  {
    slug: "terraform",
    title: "Terraform — Infrastructure as Code",
    short: "Terraform",
    icon: "🏗️",
    level: "Intermediate",
    time: "5 h",
    tagline: "Write your cloud in code, review it in a pull request, create it with one command.",
    intro:
      "Terraform lets you declare infrastructure — networks, servers, databases, DNS — in HashiCorp Configuration Language (HCL). It compares your code with the real world, shows a plan of exactly what will change, and then makes the changes through cloud provider APIs.",
    why: [
      "Reproducible environments: dev, staging and prod built from the same code.",
      "Changes are reviewed in pull requests, just like application code.",
      "Works with AWS, Azure, GCP, Kubernetes, Cloudflare, GitHub and thousands more providers.",
    ],
    concepts: [
      { t: "Provider", d: "A plugin that talks to an API, e.g. <code>hashicorp/aws</code>." },
      { t: "Resource", d: "Something Terraform creates and manages: <code>aws_instance</code>, <code>aws_s3_bucket</code>…" },
      { t: "Data source", d: "Reads existing information, e.g. the latest Ubuntu AMI, without managing it." },
      { t: "Variable & Output", d: "<b>Variables</b> are inputs to your code; <b>outputs</b> expose values like an instance's IP." },
      { t: "State", d: "<code>terraform.tfstate</code> maps your code to real resource IDs. Guard it carefully — it can contain secrets." },
      { t: "Module", d: "A reusable folder of Terraform code, like a function for infrastructure." },
    ],
    sections: [
      {
        h: "The core workflow",
        html: `<div class="flow-row"><span>write .tf</span><i>→</i><span>terraform init</span><i>→</i><span>terraform plan</span><i>→</i><span>terraform apply</span><i>→</i><span>terraform destroy</span></div>
        <p><code>init</code> downloads providers, <code>plan</code> shows the diff (+ create, ~ update, − destroy), <code>apply</code> executes it, <code>destroy</code> removes everything.</p>`,
      },
      {
        h: "A complete example: web server on AWS",
        code: { lang: "main.tf", src: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_security_group" "web" {
  name = "web-sg"
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.web.id]
  user_data              = <<-EOF
    #!/bin/bash
    apt-get update && apt-get install -y nginx
  EOF
  tags = { Name = "\${var.project}-web" }
}` },
      },
      {
        h: "Variables and outputs",
        code: { lang: "variables.tf / outputs.tf", src: `variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "project" {
  type = string
}

output "public_ip" {
  value = aws_instance.web.public_ip
}` },
      },
      {
        h: "Remote state & locking",
        html: `<p>Local state files get lost and can't be shared. Teams store state in a remote <b>backend</b> such as S3, with locking so two people can't apply at the same time.</p>`,
        code: { lang: "backend.tf", src: `terraform {
  backend "s3" {
    bucket       = "my-tf-state-bucket"
    key          = "course/web/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true   # native S3 locking (Terraform 1.10+)
  }
}` },
      },
    ],
    lab: {
      title: "Provision and destroy an EC2 web server",
      steps: [
        { t: "Install Terraform and make sure your AWS CLI credentials work.", code: `terraform -version
aws sts get-caller-identity` },
        { t: "Create <code>main.tf</code>, <code>variables.tf</code> and <code>outputs.tf</code> from the examples above." },
        { t: "Initialise, format and validate.", code: `terraform init
terraform fmt
terraform validate` },
        { t: "Plan and apply. Read the plan carefully before typing <code>yes</code>.", code: `terraform plan -var="project=course"
terraform apply -var="project=course"` },
        { t: "Open the <code>public_ip</code> output in your browser, then clean up.", code: `terraform output public_ip
terraform destroy -var="project=course"` },
      ],
    },
    cheats: [
      ["terraform init", "Download providers, set up backend"],
      ["terraform fmt -recursive", "Format all .tf files"],
      ["terraform validate", "Check syntax"],
      ["terraform plan -out=tf.plan", "Save a plan to apply later"],
      ["terraform apply tf.plan", "Apply exactly that plan"],
      ["terraform state list", "List resources in state"],
      ["terraform import ADDR ID", "Adopt an existing resource"],
      ["terraform destroy", "Delete all managed resources"],
    ],
    best: [
      "Use remote state with locking and encryption for anything shared.",
      "Never commit <code>terraform.tfstate</code> or <code>*.tfvars</code> containing secrets.",
      "Pin provider versions with <code>~&gt;</code> constraints.",
      "Run <code>terraform plan</code> in CI on every pull request.",
      "Keep environments in separate state files (folders or workspaces).",
    ],
    quiz: [
      { q: "Which command shows what Terraform will change without changing anything?", o: ["terraform apply", "terraform plan", "terraform init", "terraform show"], a: 1, e: "plan computes the diff between code and reality; apply executes it." },
      { q: "What is the Terraform state file for?", o: ["Storing provider binaries", "Mapping code to real resource IDs", "Holding the HCL syntax rules", "Logging CLI output"], a: 1, e: "State links each resource in your code to the actual object in the cloud." },
      { q: "Why use a remote backend with locking?", o: ["It makes plans faster", "So teams share state and can't apply simultaneously", "It's required for AWS", "To avoid writing variables"], a: 1, e: "Remote state is shared and durable; locking prevents conflicting applies." },
    ],
    links: [
      ["Terraform documentation", "https://developer.hashicorp.com/terraform/docs"],
      ["AWS provider registry", "https://registry.terraform.io/providers/hashicorp/aws/latest/docs"],
    ],
  },

  /* ------------------------------------------------------ KUBERNETES */
  {
    slug: "kubernetes",
    title: "Kubernetes",
    short: "Kubernetes",
    icon: "☸️",
    level: "Advanced",
    time: "8 h",
    tagline: "Tell the cluster what you want running — it schedules, heals and scales it for you.",
    intro:
      "Kubernetes (K8s) is a container orchestrator. You declare the desired state in YAML — “run 3 replicas of this image, reachable on port 80” — and Kubernetes continuously works to make reality match: restarting crashed containers, rescheduling on healthy nodes and rolling out updates without downtime.",
    why: [
      "The industry standard for running containers in production on every major cloud (EKS, AKS, GKE).",
      "Self-healing, auto-scaling and zero-downtime rolling updates out of the box.",
      "A huge ecosystem: Helm, Argo CD, Prometheus, service meshes and more.",
    ],
    concepts: [
      { t: "Cluster & Nodes", d: "A cluster is a set of machines (<b>nodes</b>) that run your containers, managed by a <b>control plane</b>." },
      { t: "Pod", d: "The smallest deployable unit: one or more containers sharing network and storage." },
      { t: "Deployment", d: "Manages a ReplicaSet of identical pods; handles scaling and rolling updates." },
      { t: "Service", d: "A stable virtual IP and DNS name that load-balances to a set of pods." },
      { t: "Ingress", d: "HTTP(S) routing from outside the cluster to services, by host name and path." },
      { t: "ConfigMap & Secret", d: "Inject configuration and sensitive values into pods without rebuilding images." },
    ],
    sections: [
      {
        h: "Cluster architecture",
        html: `<div class="arch">
          <div class="arch-box"><h5>Control plane</h5><ul>
            <li><b>kube-apiserver</b> — front door; every command goes through it</li>
            <li><b>etcd</b> — key-value store holding all cluster state</li>
            <li><b>kube-scheduler</b> — decides which node runs each pod</li>
            <li><b>controller-manager</b> — loops that reconcile desired vs actual state</li>
          </ul></div>
          <div class="arch-box"><h5>Worker node</h5><ul>
            <li><b>kubelet</b> — agent that starts pods and reports health</li>
            <li><b>kube-proxy</b> — implements Service networking rules</li>
            <li><b>container runtime</b> — containerd / CRI-O runs the containers</li>
          </ul></div>
        </div>`,
      },
      {
        h: "Service types",
        html: `<table class="tbl"><thead><tr><th>Type</th><th>Reachable from</th><th>Use case</th></tr></thead><tbody>
          <tr><td><b>ClusterIP</b></td><td>Inside the cluster only</td><td>Internal APIs, databases (default)</td></tr>
          <tr><td><b>NodePort</b></td><td>Every node's IP on a port 30000–32767</td><td>Labs, simple exposure</td></tr>
          <tr><td><b>LoadBalancer</b></td><td>A cloud load balancer's public IP</td><td>Exposing apps on EKS/AKS/GKE</td></tr>
        </tbody></table>`,
      },
      {
        h: "Deployment + Service manifest",
        code: { lang: "app.yaml", src: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
          resources:
            requests: { cpu: 100m, memory: 64Mi }
            limits:   { cpu: 250m, memory: 128Mi }
          readinessProbe:
            httpGet: { path: /, port: 80 }
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP` },
      },
      {
        h: "Packaging with Helm",
        html: `<p><b>Helm</b> is the package manager for Kubernetes. A <b>chart</b> is a templated bundle of manifests; <b>values</b> customise it per environment.</p>`,
        code: { lang: "bash", src: `helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-redis bitnami/redis --set auth.enabled=false
helm list
helm upgrade my-redis bitnami/redis -f values-prod.yaml
helm uninstall my-redis` },
      },
    ],
    lab: {
      title: "Deploy, scale, update and roll back an app",
      steps: [
        { t: "Create a local cluster with kind (or minikube) and check it.", code: `kind create cluster --name course
kubectl get nodes` },
        { t: "Apply the manifest above and watch the pods start.", code: `kubectl apply -f app.yaml
kubectl get pods -w` },
        { t: "Reach the app through a port-forward: http://localhost:8080", code: `kubectl port-forward svc/web 8080:80` },
        { t: "Scale up, then delete a pod and watch Kubernetes replace it (self-healing).", code: `kubectl scale deployment web --replicas=5
kubectl delete pod -l app=web --wait=false
kubectl get pods` },
        { t: "Roll out a new version and roll it back.", code: `kubectl set image deployment/web web=nginx:1.27-alpine
kubectl rollout status deployment/web
kubectl rollout undo deployment/web` },
      ],
    },
    cheats: [
      ["kubectl get pods -A", "Pods in all namespaces"],
      ["kubectl describe pod NAME", "Details & events (great for debugging)"],
      ["kubectl logs -f NAME", "Stream container logs"],
      ["kubectl exec -it NAME -- sh", "Shell inside a pod"],
      ["kubectl apply -f file.yaml", "Create or update resources"],
      ["kubectl rollout undo deploy/NAME", "Roll back a deployment"],
      ["kubectl get events --sort-by=.lastTimestamp", "Recent cluster events"],
      ["kubectl config get-contexts", "List clusters you can talk to"],
    ],
    best: [
      "Always set resource requests and limits on containers.",
      "Add readiness and liveness probes so traffic only reaches healthy pods.",
      "Use namespaces to separate teams and environments.",
      "Store manifests in Git and deploy with GitOps (Argo CD / Flux).",
      "Never put secrets in images or plain ConfigMaps.",
    ],
    quiz: [
      { q: "What is the smallest deployable unit in Kubernetes?", o: ["Container", "Pod", "Node", "Deployment"], a: 1, e: "Kubernetes schedules pods; a pod wraps one or more containers." },
      { q: "Which component stores the entire cluster state?", o: ["kubelet", "kube-proxy", "etcd", "kube-scheduler"], a: 2, e: "etcd is the consistent key-value store behind the API server." },
      { q: "Which Service type is reachable only inside the cluster?", o: ["NodePort", "LoadBalancer", "ClusterIP", "Ingress"], a: 2, e: "ClusterIP is the default and is internal only." },
    ],
    links: [
      ["Kubernetes documentation", "https://kubernetes.io/docs/home/"],
      ["kubectl cheat sheet", "https://kubernetes.io/docs/reference/kubectl/quick-reference/"],
      ["Helm docs", "https://helm.sh/docs/"],
    ],
  },

  /* ------------------------------------------------------ MONITORING */
  {
    slug: "monitoring",
    title: "Monitoring & Observability",
    short: "Monitoring",
    icon: "📈",
    level: "Advanced",
    time: "6 h",
    tagline: "Prometheus, Grafana, Loki and Alloy — see inside your systems before users notice problems.",
    intro:
      "Monitoring tells you <i>when</i> something is wrong; observability helps you understand <i>why</i>. You'll build the popular open-source Grafana stack: Alloy collects metrics and logs, Prometheus stores metrics, Loki stores logs, and Grafana turns it all into dashboards and alerts.",
    why: [
      "You can't fix what you can't see — outages are found by alerts, not angry users.",
      "Metrics and logs prove whether a deploy made things better or worse.",
      "SLOs and dashboards give the whole team a shared picture of system health.",
    ],
    concepts: [
      { t: "Metrics", d: "Numbers over time (CPU %, requests/sec, latency). Cheap to store, great for alerts and trends." },
      { t: "Logs", d: "Timestamped text events from applications. Rich detail for debugging specific problems." },
      { t: "Traces", d: "Follow one request across many services to find where time is spent." },
      { t: "Labels", d: "Key-value pairs (<code>job=\"api\"</code>, <code>env=\"prod\"</code>) used to filter and group series and log streams." },
      { t: "Golden signals", d: "Latency, Traffic, Errors and Saturation — the four things to watch for any service." },
      { t: "SLI / SLO", d: "An indicator you measure (e.g. % successful requests) and the target you promise (e.g. 99.9%)." },
    ],
    sections: [
      {
        h: "How the stack fits together",
        html: `<div class="flow-row"><span>Apps · Nodes · K8s</span><i>→</i><span>Alloy (collect)</span><i>→</i><span>Prometheus (metrics) · Loki (logs)</span><i>→</i><span>Grafana (visualise & alert)</span></div>
        <div class="obs-grid">
          <div class="obs"><h4>🔥 Prometheus</h4><p>Time-series database that <b>pulls</b> (scrapes) metrics from <code>/metrics</code> endpoints. Query with <b>PromQL</b>; alert via Alertmanager.</p></div>
          <div class="obs"><h4>📊 Grafana</h4><p>Dashboards and alerting for many data sources. Explore metrics and logs side by side.</p></div>
          <div class="obs"><h4>🪵 Loki</h4><p>Log store that indexes only <b>labels</b>, not full text — cheap and fast. Query with <b>LogQL</b>.</p></div>
          <div class="obs"><h4>🧲 Alloy</h4><p>Grafana's OpenTelemetry-compatible collector. Discovers targets, scrapes metrics, tails logs and forwards them.</p></div>
        </div>`,
      },
      {
        h: "Prometheus: scraping & PromQL",
        html: `<p>Prometheus reads a config listing what to scrape. <b>Exporters</b> translate systems into metrics — e.g. <code>node_exporter</code> for Linux hosts on port 9100.</p>`,
        code: { lang: "prometheus.yml", src: `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: node
    static_configs:
      - targets: ["192.168.56.10:9100", "192.168.56.11:9100"]

# --- useful PromQL queries ---
# up                                              -> 1 if target is reachable
# rate(http_requests_total[5m])                   -> requests per second
# 100 - avg by (instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
# histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m])))` },
      },
      {
        h: "Alerting rules",
        code: { lang: "alerts.yml", src: `groups:
  - name: node
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.instance }} is down"

      - alert: HighCpu
        expr: 100 - avg by (instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100 > 85
        for: 10m
        labels:
          severity: warning` },
      },
      {
        h: "Loki & LogQL",
        html: `<p>Select a log stream by labels, then filter and parse. Keep labels low-cardinality (app, env, namespace) — never user IDs or request IDs.</p>`,
        code: { lang: "LogQL", src: `{app="web"}                                  # all logs from the web app
{app="web"} |= "error"                       # lines containing "error"
{app="web"} | json | status >= 500           # parse JSON, filter by field
sum by (app) (rate({env="prod"} |= "error" [5m]))   # error rate per app` },
      },
      {
        h: "Alloy: one collector for metrics and logs",
        html: `<p>Alloy configs are built from <b>components</b> wired together: each one's output is forwarded to the next.</p>`,
        code: { lang: "config.alloy", src: `// ---- Metrics: host stats -> Prometheus ----
prometheus.exporter.unix "node" { }

prometheus.scrape "node" {
  targets    = prometheus.exporter.unix.node.targets
  forward_to = [prometheus.remote_write.local.receiver]
}

prometheus.remote_write "local" {
  endpoint {
    url = "http://prometheus:9090/api/v1/write"
  }
}

// ---- Logs: /var/log files -> Loki ----
local.file_match "syslog" {
  path_targets = [{"__path__" = "/var/log/*.log", "job" = "varlogs"}]
}

loki.source.file "syslog" {
  targets    = local.file_match.syslog.targets
  forward_to = [loki.write.local.receiver]
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}` },
      },
    ],
    lab: {
      title: "Run the full observability stack with Docker Compose",
      steps: [
        { t: "Create a folder with <code>config.alloy</code> (above), a minimal <code>prometheus.yml</code> and this <code>compose.yaml</code>.", code: `services:
  prometheus:
    image: prom/prometheus:latest
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --web.enable-remote-write-receiver
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports: ["9090:9090"]

  loki:
    image: grafana/loki:latest
    ports: ["3100:3100"]

  alloy:
    image: grafana/alloy:latest
    command: run /etc/alloy/config.alloy --server.http.listen-addr=0.0.0.0:12345
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy
      - /var/log:/var/log:ro
    ports: ["12345:12345"]

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]` },
        { t: "Start everything and check the containers are healthy.", code: `docker compose up -d
docker compose ps` },
        { t: "Open Prometheus at http://localhost:9090 and run the query <code>up</code>. Open the Alloy UI at http://localhost:12345 to see your component graph." },
        { t: "Open Grafana at http://localhost:3000 (admin / admin). Add data sources: Prometheus → <code>http://prometheus:9090</code>, Loki → <code>http://loki:3100</code>." },
        { t: "In <b>Explore</b>, query <code>{job=\"varlogs\"}</code> for logs; then import the “Node Exporter Full” dashboard (ID 1860) for host metrics." },
      ],
    },
    cheats: [
      ["up", "PromQL: which targets are up"],
      ["rate(metric[5m])", "PromQL: per-second rate of a counter"],
      ["sum by (job)(...)", "PromQL: aggregate by a label"],
      ["histogram_quantile(0.95, ...)", "PromQL: 95th percentile latency"],
      ['{app="web"} |= "error"', "LogQL: filter log lines"],
      ['{app="web"} | json', "LogQL: parse JSON logs"],
      ["alloy fmt config.alloy", "Format an Alloy config"],
      ["promtool check config prometheus.yml", "Validate Prometheus config"],
    ],
    best: [
      "Alert on symptoms users feel (errors, latency), not on every CPU spike.",
      "Every alert should be actionable and link to a runbook.",
      "Keep label cardinality low in both Prometheus and Loki.",
      "Provision Grafana dashboards and data sources as code.",
      "Define SLOs for key services and track error budgets.",
    ],
    quiz: [
      { q: "How does Prometheus usually collect metrics?", o: ["Apps push to it over SSH", "It pulls (scrapes) /metrics endpoints", "It reads log files", "From Grafana"], a: 1, e: "Prometheus is pull-based: it scrapes HTTP /metrics endpoints on a schedule." },
      { q: "What does Loki index?", o: ["The full text of every log line", "Only labels", "Nothing at all", "Only timestamps"], a: 1, e: "Indexing only labels is what makes Loki cheap to run." },
      { q: "What is Grafana Alloy's job in the stack?", o: ["Storing metrics long-term", "Drawing dashboards", "Collecting and forwarding metrics, logs and traces", "Replacing Kubernetes"], a: 2, e: "Alloy is the collector/agent that gathers telemetry and ships it to Prometheus, Loki, etc." },
    ],
    links: [
      ["Prometheus docs", "https://prometheus.io/docs/introduction/overview/"],
      ["Grafana docs", "https://grafana.com/docs/grafana/latest/"],
      ["Loki docs", "https://grafana.com/docs/loki/latest/"],
      ["Alloy docs", "https://grafana.com/docs/alloy/latest/"],
    ],
  },
];
