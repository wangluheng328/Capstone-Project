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

Finished connections between front-end and back-end for deltaSVM graph and TPM violin plot, and successfully generated plots.
Data for the CRE plot and deltaSVM graph is on AWS S3.
The database for TPM violin plot is stored locally in a MySQL database.
This local MySQL database will be moved to AWS RDS service.
For deltaSVM graph, we are currently using rsid to retrieve records but will switch to chromosome position + allele if we can find a way to store the "rsid-position+allele relation" file. 



## Links
