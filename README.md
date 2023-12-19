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


12/11 Zejun

 - Finished connections between front-end and back-end for deltaSVM graph and TPM violin plot, and successfully generated plots.
 - Data for the CRE plot and deltaSVM graph is on AWS S3.
 - The database for TPM violin plot is stored locally in a MySQL database.
 - This local MySQL database will be moved to AWS RDS service.
 - For deltaSVM graph, we are currently using rsid to retrieve records but will switch to chromosome position + allele if we can find a way to store the "rsid-position+allele relation" file. 


12/19 Wes

Deploy deltaSVM server

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

Deploy TPM server

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
