# Capstone-Project

## Introduction


## Team Update

9/29 Wes

Resources related to project:
1. IGV- a standalone PC genome
 browser:
https://software.broadinstitute.org/software/igv/
2. UCSC web-based genome
 browser:
https://genome.ucsc.edu/cgi-bin/hgGateway
3. Locus zoom is a library
 that generates GWAS plots, and is open source:
https://github.com/statgen/locuszoom
4. Bio-index, an AWS-centric
 indexing tool for genomic data:
https://github.com/broadinstitute/dig-bioindex

12/8 Ming

- Used Flask framework to connect the frontend and the backend for CRE plot.
- Simulated a frontend to test the backend and successfully generated plots.

12/11 Zejun

 - Finished connections between front-end and back-end for deltaSVM graph and TPM violin plot, and successfully generated plots.
 - Data for the CRE plot and deltaSVM graph is on AWS S3.
 - The database for TPM violin plot is stored locally in a MySQL database.
 - This local MySQL database will be moved to AWS RDS service.
 - For deltaSVM graph, we are currently using rsid to retrieve records but will switch to chromosome position + allele if we can find a way to store the "rsid-position+allele relation" file. 

12/19 Wes

Deployed URL: http://3.15.180.14/

### Deploy GWAS and CRE server

A. Launch EC2 instance
1. Come up with an EC2 instance name
2. Select Amazon Linux (Ubuntu also works but below all "yum" need to be replaced by "apt-get")
3. Select t2.micro (free tier)
4. Create a new key pair (select .ppk)
5. Launch

B. Configure Security Group
1. Go to instance detail page
2. Go to Security tab below
3. Go to security group
4. Add inbound rule
5. Select Custom TCP, port range 8100, source Anywhere-IPv4
6. Select HTTP, source Anywhere-IPv4
7. Select HTTPS, source Anywhere-IPv4
8. Save rules

C. Deploy (after connected to the instance by clicking Connect)
1. sudo su -
2. yum update -y
3. yum install httpd -y
4. yum install python3-pip
5. yum install git
6. yum install tmux
7. service httpd start
8. git clone this repository
9. cd into locuszoom-main directory
10. cp -r * /var/www/html
11. tmux
12. pip install -r requirements.txt
13. cd into CRE directory
14. python3 Flask-CRE.py

D. Note

In the index.html file, you need to change the CREUrl, deltaSVMUrl and TPMUrl to corresponding server IP endpoints. For instance, assuming your deltaSVM server is running on the IP address 12.34.567.890, then deltaSVMUrl should be http://12.34.567.890:8101/generate_deltasvm_plot. For CRE, the port is 8100, and TPM 8102. Modify correspondingly.


### Deploy deltaSVM server

A. Launch EC2 instance
1. Come up with an EC2 instance name
2. Select Amazon Linux (Ubuntu also works but below all "yum" need to be replaced by "apt-get")
3. Select t2.micro (free tier)
4. Create a new key pair (select .ppk)
5. Launch

B. Configure Security Group
1. Go to instance detail page
2. Go to Security tab below
3. Go to security group
4. Add inbound rule
5. Select Custom TCP, port range 8101, source Anywhere-IPv4
6. Save rules

C. Deploy (after connected to the instance by clicking Connect)
1. sudo su -
2. yum install python3-pip
3. yum install git
4. yum install tmux
5. git clone this repository
6. tmux
7. pip install -r requirements.txt
8. python3 Flask-deltasvm.py

### Deploy TPM server

A. Launch EC2 instance
1. Come up with an EC2 instance name
2. Select Amazon Linux (Ubuntu also works but below all "yum" need to be replaced by "apt-get")
3. Select t2.micro (free tier)
4. Create a new key pair (select .ppk)
5. Launch

B. Configure Security Group
1. Go to instance detail page
2. Go to Security tab below
3. Go to security group
4. Add inbound rule
5. Select Custom TCP, port range 8102, source Anywhere-IPv4
6. Save rules

C. Deploy (after connected to the instance by clicking Connect)
1. sudo su -
2. yum install python3-pip
3. yum install git
4. yum install tmux
5. git clone this repository
6. tmux
7. pip install -r requirements.txt
8. python3 Flask_TPM.py



## Links
