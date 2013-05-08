# Brozie's RabbitMQ based Jobqueue


## What is Brozie

Brozie is a new type of browser that makes all websites interactive for the user without registering or installing anything, and the service is completely free. Its framework provides a separate channel of communication for individual websites. Through Brozie, users can talk and share content with each other on the same site in real-time.


## Why does Brozie need a jobqueu system

Brozie has a lot of backend procedure like NewsCloud updating or refresh of friends recommendations. These are important processes but these may take more time than we can do it in realtime. So we thought a lot and made a reliable jobqueue system that can do these tasks in the background.


## Why RabbitMQ

RabbitMQ is written in Erlang and it works asynchronously and that was an important thing when we chose. RabbitMQ implements AMQP (Advanced Message Queuing Protocol) which is a standard message protocol and almost every language has a module that supports it. We use PHP and Node.js based modules. In our decision played a serious role, that RabbitMQ has a fancy webUI.

Redis: We could have chosen Redis also, but it wouldn't be the best solution for that type of use.

ZeroMQ: We tried it, and it was really fast, but... it would need much more development and it couldn't support message routing.


##How it works

We use Node.js workers because of the pub-sub interface. After starting the server it forks workers based on configs. All workers connect to RabbitMQ and make database connections and other initial functions and after that they listen on queues.

Every type of task has a queue in RabbitMQ and a task source code in a directory called tasks. When a new job gets to the queue, the worker gets it and starts a task with the job's parameters and shared connections. (We use JSON formatted task parameters.) The task process works on the job, insert data to database or convert images and when it ends it calls callback function. If the callback has an error parameter the worker takes the job back to RabbitMQ.

All workers work independently and you can start tasks paralelly.


##Where are the tests

We have a lot but these test only the tasks. Our fault :|


##Experiences and numbers

The Brozie has used this system for 4 months. We have about 15 tasks that makes a lot of database operation and crawler processes. The average load is 2-3000 job/min and the peak was 11000 job/min. Workers' starting memory use is 30 MB/worker and the average is 45-100 MB/worker based on the type of the task.


##Feedback

You can use this server for free, but we like feedbacks and pull requests :)